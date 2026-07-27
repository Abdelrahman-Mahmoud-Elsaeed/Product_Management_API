variable "environment" {
  type        = string
  description = "Environment name (dev, prod, etc.)"
}

variable "container_image" {
  type        = string
  description = "Full ECR image URL (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/dev-app-repo:latest)"
}

variable "container_port" {
  type        = number
  description = "Port the application container listens on"
}

variable "replicas" {
  type        = number
  default     = 1
  description = "Number of pod replicas"
}

variable "target_group_arn" {
  type        = string
  description = "ARN of the ALB target group to bind pods to"
}

variable "secret_key_arn" {
  type        = string
  description = "ARN of the SECRET_KEY secret in Secrets Manager"
}

variable "session_secret_arn" {
  type        = string
  description = "ARN of the SESSION_SECRET secret in Secrets Manager"
}

variable "password_secret_key_arn" {
  type        = string
  description = "ARN of the PASSWORD_SECRET_KEY secret in Secrets Manager"
}

variable "db_connection_arn" {
  type        = string
  description = "ARN of the DATABASE_CONNECTION secret in Secrets Manager"
}

variable "alb_controller_helm_release_name" {
  type        = string
  default     = "aws-load-balancer-controller"
  description = "Name of the Helm release for the ALB controller (used as depends_on signal via variable)"
}
