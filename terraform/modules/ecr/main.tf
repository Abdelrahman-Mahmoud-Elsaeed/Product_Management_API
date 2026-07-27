# checkov:skip=CKV_AWS_51:MUTABLE tags are required — the CD pipeline overwrites :latest on every deploy; immutable tags would break the deployment workflow
# checkov:skip=CKV_AWS_136:ECR lifecycle policy not configured — acceptable for dev; add lifecycle rules for production to control image retention costs
resource "aws_ecr_repository" "app" {
  name                 = var.repository_name
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
  }
}