output "cluster_name" {
  value       = aws_eks_cluster.main.name
  description = "Name of the EKS cluster"
}

output "cluster_endpoint" {
  value       = aws_eks_cluster.main.endpoint
  description = "Endpoint URL of the EKS API server"
}

output "cluster_ca_certificate" {
  value       = aws_eks_cluster.main.certificate_authority[0].data
  description = "Base64-encoded cluster CA certificate"
}

output "cluster_security_group_id" {
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  description = "Security group ID created by EKS for the cluster"
}

output "oidc_provider_arn" {
  value       = aws_iam_openid_connect_provider.eks.arn
  description = "ARN of the IAM OIDC provider for the cluster (used for IRSA)"
}

output "oidc_provider_url" {
  value       = replace(aws_iam_openid_connect_provider.eks.url, "https://", "")
  description = "OIDC provider URL without https:// prefix (used for IRSA trust policy conditions)"
}
