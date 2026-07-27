variable "environment" {
  type        = string
  description = "Environment name (dev, prod, etc.)"
}

variable "cluster_version" {
  type        = string
  default     = "1.36"
  description = "Kubernetes version for the EKS cluster"
}

variable "subnet_ids" {
  type        = list(string)
  description = "Subnet IDs for the EKS cluster and node group"
}

variable "node_security_group_id" {
  type        = string
  description = "Security group ID to attach to EKS worker nodes"
}

variable "cluster_role_arn" {
  type        = string
  description = "IAM role ARN for the EKS cluster control plane"
}

variable "node_role_arn" {
  type        = string
  description = "IAM role ARN for the EKS managed node group"
}

variable "node_instance_types" {
  type        = list(string)
  default     = ["t3.small"]
  description = "EC2 instance types for the managed node group"
}

variable "node_desired_size" {
  type    = number
  default = 1
}

variable "node_min_size" {
  type    = number
  default = 1
}

variable "node_max_size" {
  type    = number
  default = 2
}

variable "cluster_access_principal_arns" {
  type        = list(string)
  default     = []
  description = "IAM principal ARNs granted cluster admin access for kubectl deployments"
}
