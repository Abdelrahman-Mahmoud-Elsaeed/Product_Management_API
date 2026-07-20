module "network" {
  source              = "../../modules/network"
  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  availability_zones  = var.availability_zones
}

module "security" {
  source      = "../../modules/security"
  vpc_id      = module.network.vpc_id
  app_port    = var.app_port
  environment = var.environment
}


module "secrets" {
  source      = "../../modules/secrets"
  environment = var.environment
}

module "iam" {
  source      = "../../modules/iam"
  environment = var.environment
  secret_arns = module.secrets.all_secret_arns
}

module "cloudwatch" {
  source         = "../../modules/cloudwatch"
  log_group_name = "/ecs/${var.environment}-app"
  environment    = var.environment
}

module "ecr" {
  source          = "../../modules/ecr"
  repository_name = "${var.environment}-app-repo"
  environment     = var.environment
}

module "alb" {
  source            = "../../modules/alb"
  environment       = var.environment
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  security_group_id = module.security.alb_security_group_id
  app_port          = var.app_port
}

module "ecs" {
  source             = "../../modules/ecs"
  environment        = var.environment
  aws_region         = var.aws_region
  container_image    = "${module.ecr.repository_url}:latest"
  container_port     = var.app_port
  desired_count      = 1
  subnet_ids         = module.network.public_subnet_ids
  security_group_id  = module.security.ecs_tasks_security_group_id
  target_group_arn   = module.alb.target_group_arn
  execution_role_arn = module.iam.ecs_execution_role_arn
  task_role_arn      = module.iam.ecs_task_role_arn
  log_group_name     = module.cloudwatch.log_group_name

  secret_key_arn          = module.secrets.secret_key_arn
  session_secret_arn      = module.secrets.session_secret_arn
  password_secret_key_arn = module.secrets.password_secret_key_arn
  db_connection_arn       = module.secrets.db_connection_arn
}