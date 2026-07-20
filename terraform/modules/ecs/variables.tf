variable "environment" { type = string }
variable "container_image" { type = string }
variable "container_port" { type = number }
variable "desired_count" { type = number }
variable "subnet_ids" { type = list(string) }
variable "security_group_id" { type = string }
variable "target_group_arn" { type = string }
variable "execution_role_arn" { type = string }
variable "task_role_arn" { type = string }
variable "log_group_name" { type = string }
variable "aws_region" { type = string }
variable "secret_key_arn" { type = string }
variable "session_secret_arn" { type = string }
variable "password_secret_key_arn" { type = string }
variable "db_connection_arn" {
  type = string
}
