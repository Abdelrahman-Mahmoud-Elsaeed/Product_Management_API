# ─── EKS Cluster ──────────────────────────────────────────────────────────────

# checkov:skip=CKV_AWS_58:EKS secrets envelope encryption requires a KMS key — cost trade-off for dev; enable for production
# checkov:skip=CKV_AWS_37:Control plane logging (audit, api, authenticator) adds CloudWatch cost — acceptable for dev
# checkov:skip=CKV_AWS_38:Public endpoint access is required for kubectl from GitHub Actions and local machines in this dev setup
# checkov:skip=CKV_AWS_39:Public access CIDR restriction disabled for dev; restrict to known CIDRs for production
# checkov:skip=CKV_EKS_1:Cluster logging disabled intentionally for dev cost savings; enable for production
resource "aws_eks_cluster" "main" {           # nosemgrep: terraform.lang.security.eks-public-endpoint-enabled.eks-public-endpoint-enabled
  name     = "${var.environment}-eks-cluster" # nosemgrep: terraform.lang.security.eks-insufficient-control-plane-logging.eks-insufficient-control-plane-logging
  role_arn = var.cluster_role_arn
  version  = var.cluster_version

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_public_access  = true
    endpoint_private_access = false
  }

  access_config {
    authentication_mode                         = "API_AND_CONFIG_MAP"
    bootstrap_cluster_creator_admin_permissions = true
  }

  tags = {
    Environment = var.environment
  }
}

# ─── Node Group ───────────────────────────────────────────────────────────────

# checkov:skip=CKV_AWS_341:Launch template does not disable IMDS hop limit — hop limit of 2 is acceptable for EKS nodes that run pods needing IMDS
# checkov:skip=CKV_AWS_8:Root volume encryption requires a KMS key — cost trade-off for dev; enable for production
resource "aws_launch_template" "nodes" {
  name_prefix = "${var.environment}-eks-nodes-"

  vpc_security_group_ids = [
    var.node_security_group_id,
    aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
  ]

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
  }

  tag_specifications {
    resource_type = "instance"

    tags = {
      Environment = var.environment
    }
  }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.environment}-node-group"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.subnet_ids

  instance_types = var.node_instance_types

  launch_template {
    id      = aws_launch_template.nodes.id
    version = aws_launch_template.nodes.latest_version
  }

  scaling_config {
    desired_size = var.node_desired_size
    min_size     = var.node_min_size
    max_size     = var.node_max_size
  }

  depends_on = [aws_eks_cluster.main]

  tags = {
    Environment = var.environment
  }
}

# ─── OIDC Provider (enables IRSA for pods) ────────────────────────────────────

data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = {
    Environment = var.environment
  }
}

# ─── Cluster Access Entries (additional principals only) ──────────────────────
# The cluster creator already gets admin access via bootstrap_cluster_creator_admin_permissions = true
# in the access_config block above. These entries grant access to ADDITIONAL principals
# (e.g. CI/CD IAM users, other team members).

resource "aws_eks_access_entry" "admin" {
  for_each = toset(var.cluster_access_principal_arns)

  cluster_name  = aws_eks_cluster.main.name
  principal_arn = each.value
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "admin" {
  for_each = toset(var.cluster_access_principal_arns)

  cluster_name  = aws_eks_cluster.main.name
  principal_arn = each.value
  policy_arn    = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin]
}
