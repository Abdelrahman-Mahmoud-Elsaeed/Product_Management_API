terraform {
  backend "s3" {
    # Configure later
  }
}

module "network" {
  source = "../../modules/network"
}

module "security" {
  source = "../../modules/security"
}

module "ecr" {
  source = "../../modules/ecr"
}

module "iam" {
  source = "../../modules/iam"
}

module "alb" {
  source = "../../modules/alb"
}

module "ecs" {
  source = "../../modules/ecs"
}

module "cloudwatch" {
  source = "../../modules/cloudwatch"
}