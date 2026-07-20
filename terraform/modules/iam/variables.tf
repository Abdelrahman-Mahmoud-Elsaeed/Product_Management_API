variable "environment" {
  type        = string
  description = "Environment name"
}

variable "secret_arns" {
  type        = list(string)
  default     = []
  description = "List of Secrets Manager ARNs to grant read access to"
}