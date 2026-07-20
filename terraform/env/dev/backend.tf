terraform {
  backend "s3" {
    bucket         = "terraform-state-bucket-468997136367-us-east-1-an"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}