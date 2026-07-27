output "helm_release_name" {
  value       = helm_release.aws_load_balancer_controller.name
  description = "Name of the Helm release for the AWS Load Balancer Controller"
}

output "irsa_role_arn" {
  value       = aws_iam_role.aws_load_balancer_controller.arn
  description = "ARN of the IRSA role used by the AWS Load Balancer Controller"
}
