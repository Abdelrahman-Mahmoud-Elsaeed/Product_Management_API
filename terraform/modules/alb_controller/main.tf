locals {
  oidc_provider_url = var.oidc_provider_url
}

# ─── IRSA Role for the AWS Load Balancer Controller ───────────────────────────

# checkov:skip=CKV_AWS_274:This is a custom scoped IRSA role for the ALB Controller — not an AdministratorAccess policy
resource "aws_iam_role" "aws_load_balancer_controller" {
  name = "${var.environment}-aws-lb-controller-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "sts:AssumeRoleWithWebIdentity"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Condition = {
          StringEquals = {
            "${local.oidc_provider_url}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
            "${local.oidc_provider_url}:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
  }
}

# checkov:skip=CKV_AWS_288:ALB Controller policy requires specific ELB/EC2 permissions to manage load balancers — reviewed and scoped to least privilege per AWS documentation
# checkov:skip=CKV_AWS_355:ALB Controller requires wildcard resources on read-only describe actions — this is the official AWS-provided policy
resource "aws_iam_policy" "aws_load_balancer_controller" {
  name        = "${var.environment}-aws-lb-controller-policy"
  description = "IAM policy for AWS Load Balancer Controller"

  policy = file("${path.module}/policies/aws-load-balancer-controller.json")
}

resource "aws_iam_role_policy_attachment" "aws_load_balancer_controller" {
  role       = aws_iam_role.aws_load_balancer_controller.name
  policy_arn = aws_iam_policy.aws_load_balancer_controller.arn
}

# ─── Data: VPC ID (needed by the controller) ──────────────────────────────────

data "aws_subnet" "selected" {
  id = var.subnet_ids[0]
}

# ─── Helm Release ─────────────────────────────────────────────────────────────

resource "helm_release" "aws_load_balancer_controller" {
  provider = helm.eks

  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.11.0"
  timeout    = 600

  set {
    name  = "clusterName"
    value = var.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.aws_load_balancer_controller.arn
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = data.aws_subnet.selected.vpc_id
  }

  depends_on = [
    aws_iam_role_policy_attachment.aws_load_balancer_controller
  ]
}
