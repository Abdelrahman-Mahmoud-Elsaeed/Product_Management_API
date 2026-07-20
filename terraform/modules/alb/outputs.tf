output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "DNS name of the Load Balancer"
}

output "target_group_arn" {
  value       = aws_lb_target_group.main.arn
  description = "ARN of the ALB Target Group"
}