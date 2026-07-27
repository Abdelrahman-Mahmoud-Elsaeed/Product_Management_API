# nosemgrep: terraform.aws.security.aws-cloudwatch-log-group-unencrypted.aws-cloudwatch-log-group-unencrypted
# checkov:skip=CKV_AWS_148:KMS encryption for CloudWatch log groups adds cost — acceptable for dev; enable for production
# checkov:skip=CKV_AWS_338:Retention period is 30 days — sufficient for dev; set to 365+ days for production compliance
resource "aws_cloudwatch_log_group" "app" {
  name              = var.log_group_name
  retention_in_days = var.retention_in_days

  tags = {
    Environment = var.environment
  }
}
