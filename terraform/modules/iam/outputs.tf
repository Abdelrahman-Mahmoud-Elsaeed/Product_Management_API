output "eks_cluster_role_arn" {
  value       = aws_iam_role.eks_cluster.arn
  description = "ARN of the EKS cluster IAM role"
}

output "eks_node_role_arn" {
  value       = aws_iam_role.eks_node.arn
  description = "ARN of the EKS node group IAM role"
}
