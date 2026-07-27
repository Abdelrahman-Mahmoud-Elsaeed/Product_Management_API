variable "environment" {
  type        = string
  description = "Environment name (dev, prod, etc.)"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
}

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "oidc_provider_arn" {
  type        = string
  description = "ARN of the EKS OIDC provider"
}

variable "oidc_provider_url" {
  type        = string
  description = "URL of the EKS OIDC provider (without https://)"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs used to look up the VPC ID for the controller"
}
