# Secret 1: SECRET_KEY
resource "aws_secretsmanager_secret" "secret_key" {
  name                    = "product-management/${var.environment}/SECRET_KEY"
  recovery_window_in_days = 0

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "secret_key" {
  secret_id     = aws_secretsmanager_secret.secret_key.id
  secret_string = "placeholder-change-in-aws-console"
}

resource "aws_secretsmanager_secret" "session_secret" {
  name                    = "product-management/${var.environment}/SESSION_SECRET"
  recovery_window_in_days = 0

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "session_secret" {
  secret_id     = aws_secretsmanager_secret.session_secret.id
  secret_string = "placeholder-change-in-aws-console"
}

resource "aws_secretsmanager_secret" "password_secret_key" {
  name                    = "product-management/${var.environment}/PASSWORD_SECRET_KEY"
  recovery_window_in_days = 0

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "password_secret_key" {
  secret_id     = aws_secretsmanager_secret.password_secret_key.id
  secret_string = "placeholder-change-in-aws-console"
}

resource "aws_secretsmanager_secret" "db_connection" {
  name                    = "product-management/${var.environment}/DATABASE_CONNECTION"
  recovery_window_in_days = 0

  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_connection" {
  secret_id     = aws_secretsmanager_secret.db_connection.id
  secret_string = "placeholder-change-in-aws-console"
}