output "alb_dns_name" {
  description = "DNS name of the Load Balancer (application URL)"
  value       = module.alb.alb_dns_name
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = module.eks.cluster_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing container images"
  value       = module.ecr.repository_url
}

output "app_namespace" {
  description = "Kubernetes namespace where the application is deployed"
  value       = module.k8s_app.namespace
}

output "app_deployment_name" {
  description = "Name of the Kubernetes Deployment"
  value       = module.k8s_app.deployment_name
}
