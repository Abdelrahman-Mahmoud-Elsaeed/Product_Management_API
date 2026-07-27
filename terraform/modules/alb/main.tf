# checkov:skip=CKV_AWS_91:Access logging requires a dedicated S3 bucket — acceptable trade-off for dev; enable for production
# checkov:skip=CKV_AWS_92:Deletion protection disabled intentionally for dev so terraform destroy works cleanly
resource "aws_lb" "main" {
  name               = "${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  tags = {
    Environment = var.environment
  }
}

resource "aws_lb_target_group" "main" {
  name        = "${var.environment}-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200-399"
  }

  tags = {
    Environment = var.environment
  }
}

# checkov:skip=CKV_AWS_2:HTTPS listener requires ACM certificate — HTTP only for dev; add HTTPS for production
# checkov:skip=CKV_AWS_103:TLS policy not applicable on an HTTP listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}