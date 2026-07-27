# ─── Secrets Manager data reads ───────────────────────────────────────────────

data "aws_secretsmanager_secret_version" "secret_key" {
  secret_id = var.secret_key_arn
}

data "aws_secretsmanager_secret_version" "session_secret" {
  secret_id = var.session_secret_arn
}

data "aws_secretsmanager_secret_version" "password_secret_key" {
  secret_id = var.password_secret_key_arn
}

data "aws_secretsmanager_secret_version" "db_connection" {
  secret_id = var.db_connection_arn
}

# ─── Kubernetes Namespace ─────────────────────────────────────────────────────

resource "kubernetes_namespace" "app" {
  provider = kubernetes.eks

  metadata {
    name = var.environment
  }
}

# ─── Kubernetes Secret (synced from Secrets Manager) ──────────────────────────

resource "kubernetes_secret" "app" {
  provider = kubernetes.eks

  metadata {
    name      = "${var.environment}-app-secrets"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    SECRET_KEY          = data.aws_secretsmanager_secret_version.secret_key.secret_string
    SESSION_SECRET      = data.aws_secretsmanager_secret_version.session_secret.secret_string
    PASSWORD_SECRET_KEY = data.aws_secretsmanager_secret_version.password_secret_key.secret_string
    DATABASE_CONNECTION = data.aws_secretsmanager_secret_version.db_connection.secret_string
  }

  type = "Opaque"
}

# ─── Kubernetes Deployment ────────────────────────────────────────────────────

resource "kubernetes_deployment" "app" {
  provider = kubernetes.eks

  metadata {
    name      = "${var.environment}-app"
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = "${var.environment}-app"
    }
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = {
        app = "${var.environment}-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "${var.environment}-app"
        }
      }

      spec {
        container {
          name  = "${var.environment}-app"
          image = var.container_image

          port {
            container_port = var.container_port
          }

          env {
            name  = "PORT"
            value = tostring(var.container_port)
          }

          env {
            name = "SECRET_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "SECRET_KEY"
              }
            }
          }

          env {
            name = "SESSION_SECRET"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "SESSION_SECRET"
              }
            }
          }

          env {
            name = "PASSWORD_SECRET_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "PASSWORD_SECRET_KEY"
              }
            }
          }

          env {
            name = "DATABASE_CONNECTION"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "DATABASE_CONNECTION"
              }
            }
          }

          resources {
            requests = {
              cpu    = "250m"
              memory = "512Mi"
            }
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = var.container_port
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/"
              port = var.container_port
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }
        }
      }
    }
  }

  depends_on = [kubernetes_secret.app]
}

# ─── Kubernetes Service (ClusterIP) ───────────────────────────────────────────

resource "kubernetes_service" "app" {
  provider = kubernetes.eks

  metadata {
    name      = "${var.environment}-app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = "${var.environment}-app"
    }

    port {
      port        = var.container_port
      target_port = var.container_port
    }

    type = "ClusterIP"
  }

  depends_on = [kubernetes_deployment.app]
}

# ─── TargetGroupBinding (registers pods with the ALB target group) ────────────

resource "kubernetes_manifest" "target_group_binding" {
  provider = kubernetes.eks

  manifest = {
    apiVersion = "elbv2.k8s.aws/v1beta1"
    kind       = "TargetGroupBinding"
    metadata = {
      name      = "${var.environment}-app-tgb"
      namespace = kubernetes_namespace.app.metadata[0].name
    }
    spec = {
      serviceRef = {
        name = kubernetes_service.app.metadata[0].name
        port = var.container_port
      }
      targetGroupARN = var.target_group_arn
      targetType     = "ip"
    }
  }

  depends_on = [kubernetes_service.app]
}
