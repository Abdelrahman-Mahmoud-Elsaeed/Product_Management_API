variable "environment" {
  type        = string
  description = "Environment name"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where ALB targets reside"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public Subnet IDs for placing ALB"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for the ALB"
}

variable "app_port" {
  type        = number
  default     = 8080
  description = "Target port for container traffic"
}