locals {
  cluster_name = "${var.environment}-eks-cluster"
}

# ─── Networking ───────────────────────────────────────────────────────────────

module "network" {
  source              = "../../modules/network"
  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  availability_zones  = var.availability_zones
  cluster_name        = local.cluster_name
}

# ─── Security Groups ──────────────────────────────────────────────────────────

module "security" {
  source      = "../../modules/security"
  vpc_id      = module.network.vpc_id
  app_port    = var.app_port
  environment = var.environment
}

# ─── Secrets Manager ──────────────────────────────────────────────────────────

module "secrets" {
  source      = "../../modules/secrets"
  environment = var.environment
}

# ─── IAM Roles (EKS cluster + node group) ────────────────────────────────────

module "iam" {
  source      = "../../modules/iam"
  environment = var.environment
}

# ─── CloudWatch Log Group ─────────────────────────────────────────────────────

module "cloudwatch" {
  source         = "../../modules/cloudwatch"
  log_group_name = "/eks/${var.environment}-app"
  environment    = var.environment
}

# ─── ECR Repository ───────────────────────────────────────────────────────────

module "ecr" {
  source          = "../../modules/ecr"
  repository_name = "${var.environment}-app-repo"
  environment     = var.environment
}

# ─── Application Load Balancer ────────────────────────────────────────────────

module "alb" {
  source            = "../../modules/alb"
  environment       = var.environment
  vpc_id            = module.network.vpc_id
  public_subnet_ids = module.network.public_subnet_ids
  security_group_id = module.security.alb_security_group_id
  app_port          = var.app_port
}

# ─── EKS Cluster + Node Group + OIDC ─────────────────────────────────────────

module "eks" {
  source = "../../modules/eks"

  environment            = var.environment
  subnet_ids             = module.network.public_subnet_ids
  node_security_group_id = module.security.eks_nodes_security_group_id
  cluster_role_arn       = module.iam.eks_cluster_role_arn
  node_role_arn          = module.iam.eks_node_role_arn

  cluster_access_principal_arns = var.cluster_access_principal_arns
}

# ─── AWS Load Balancer Controller (IRSA + Helm) ───────────────────────────────

module "alb_controller" {
  source = "../../modules/alb_controller"

  providers = {
    helm.eks = helm.eks
  }

  environment       = var.environment
  aws_region        = var.aws_region
  cluster_name      = module.eks.cluster_name
  oidc_provider_arn = module.eks.oidc_provider_arn
  oidc_provider_url = module.eks.oidc_provider_url
  subnet_ids        = module.network.public_subnet_ids
}

# ─── Kubernetes Application Workload ──────────────────────────────────────────

module "k8s_app" {
  source = "../../modules/k8s_app"

  providers = {
    kubernetes.eks = kubernetes.eks
    kubectl.eks    = kubectl.eks
  }

  environment             = var.environment
  container_image         = "${module.ecr.repository_url}:latest"
  container_port          = var.app_port
  replicas                = var.replicas
  target_group_arn        = module.alb.target_group_arn
  secret_key_arn          = module.secrets.secret_key_arn
  session_secret_arn      = module.secrets.session_secret_arn
  password_secret_key_arn = module.secrets.password_secret_key_arn
  db_connection_arn       = module.secrets.db_connection_arn

  # Signal that the ALB controller Helm chart must be installed first
  alb_controller_helm_release_name = module.alb_controller.helm_release_name

  depends_on = [module.alb_controller]
}
