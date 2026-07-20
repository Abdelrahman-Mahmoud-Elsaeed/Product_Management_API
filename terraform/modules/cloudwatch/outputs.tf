output "log_group_name" {
  value       = aws_cloudwatch_log_group.ecs.name
  description = "Name of the created CloudWatch log group"
}