variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for subnets"
}

variable "environment" {
  type = string
}

variable "cluster_name" {
  type        = string
  default     = ""
  description = "EKS cluster name for subnet tags required by the AWS Load Balancer Controller"
}