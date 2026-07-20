variable "project_name" {
  description = "Project name"
  type        = string
}



variable "aws_region" {
  description = "AWS Region"
  type        = string
}



variable "environment" {
  type    = string
  default = "dev"
}

variable "app_port" {
  type    = number
  default = 3000
}