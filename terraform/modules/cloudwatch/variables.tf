variable "log_group_name" {
  type        = string
  description = "Name for the CloudWatch Log Group"
}

variable "retention_in_days" {
  type        = number
  default     = 30
  description = "Number of days to retain logs"
}

variable "environment" {
  type        = string
  description = "Environment name"
}