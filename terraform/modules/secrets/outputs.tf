output "secret_key_arn" {
  value = aws_secretsmanager_secret.secret_key.arn
}

output "session_secret_arn" {
  value = aws_secretsmanager_secret.session_secret.arn
}

output "password_secret_key_arn" {
  value = aws_secretsmanager_secret.password_secret_key.arn
}

output "db_connection_arn" {
  value = aws_secretsmanager_secret.db_connection.arn
}

output "all_secret_arns" {
  value = [
    aws_secretsmanager_secret.secret_key.arn,
    aws_secretsmanager_secret.session_secret.arn,
    aws_secretsmanager_secret.password_secret_key.arn,
    aws_secretsmanager_secret.db_connection.arn # Added here
  ]
}