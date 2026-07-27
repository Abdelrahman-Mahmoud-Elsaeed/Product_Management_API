output "namespace" {
  value       = kubernetes_namespace.app.metadata[0].name
  description = "Kubernetes namespace where the application is deployed"
}

output "deployment_name" {
  value       = kubernetes_deployment.app.metadata[0].name
  description = "Name of the Kubernetes Deployment"
}

output "service_name" {
  value       = kubernetes_service.app.metadata[0].name
  description = "Name of the Kubernetes Service"
}
