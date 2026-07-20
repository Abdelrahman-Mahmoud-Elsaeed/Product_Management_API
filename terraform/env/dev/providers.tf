provider "aws" {
  region = var.aws_region
  profile = "dev"
  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}