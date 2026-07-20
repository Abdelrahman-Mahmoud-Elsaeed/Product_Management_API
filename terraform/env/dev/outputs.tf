output "alb_dns_name" {
  description = "DNS name of the Load Balancer"
  value       = module.alb.alb_dns_name 
}