terraform {
  backend "s3" {
    bucket       = "terraform-state-bucket-468997136367-us-east-1-an"
    key          = "prod/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
}
