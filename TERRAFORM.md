# Terraform Infrastructure Documentation

## Overview

This document describes the Terraform infrastructure-as-code (IaC) setup for the **Product Management API**. The infrastructure is deployed on **AWS** using **Terraform 1.7+** and provisions a containerized application stack running on **Amazon EKS** with an **Application Load Balancer (ALB)**.

The application container image is built from the project `Dockerfile` (Node.js on port 3000), pushed to **Amazon ECR**, and deployed to EKS as a Kubernetes Deployment.

---

## Table of Contents

- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Module Dependency Graph](#module-dependency-graph)
- [Environment Layout](#environment-layout)
- [State Management](#state-management)
- [Modules](#modules)
  - [network](#network)
  - [security](#security)
  - [secrets](#secrets)
  - [iam](#iam)
  - [cloudwatch](#cloudwatch)
  - [ecr](#ecr)
  - [alb](#alb)
  - [eks](#eks)
  - [alb_controller](#alb_controller)
  - [k8s_app](#k8s_app)
- [Environment Configuration](#environment-configuration)
  - [Dev Environment](#dev-environment)
  - [Prod Environment](#prod-environment)
- [Variables](#variables)
- [Outputs](#outputs)
- [Usage](#usage)
- [Prerequisites](#prerequisites)
- [Security Considerations](#security-considerations)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud (us-east-1)                           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         VPC: 10.0.0.0/16                             │   │
│  │                                                                      │   │
│  │   ┌─────────────────┐    ┌─────────────────┐                        │   │
│  │   │  Public Subnet  │    │  Public Subnet  │                        │   │
│  │   │   10.0.1.0/24   │    │   10.0.2.0/24   │                        │   │
│  │   │   us-east-1a    │    │   us-east-1b    │                        │   │
│  │   └────────┬────────┘    └────────┬────────┘                        │   │
│  │            │                      │                                 │   │
│  │   ┌────────▼──────────────────────▼────────┐                        │   │
│  │   │      Application Load Balancer (ALB)   │  ← HTTP:80            │   │
│  │   │    Security Group: dev-alb-sg          │                        │   │
│  │   └────────┬───────────────────────────────┘                        │   │
│  │            │  TargetGroupBinding (IP mode)                          │   │
│  │   ┌────────▼───────────────────────────────┐                        │   │
│  │   │      Amazon EKS Cluster                  │                        │   │
│  │   │    - Managed Node Group (t3.small)       │                        │   │
│  │   │    - Replicas: 1                         │                        │   │
│  │   │    - Container Port: 3000                │                        │   │
│  │   │    - AWS Load Balancer Controller        │                        │   │
│  │   │    Security Group: dev-eks-nodes-sg      │                        │   │
│  │   │    Public subnets (no NAT Gateway)       │                        │   │
│  │   └────────┬───────────────────────────────┘                        │   │
│  │            │                                                         │   │
│  │   ┌────────▼────────┐    ┌─────────────────┐    ┌─────────────┐    │   │
│  │   │  ECR Repository │    │ Secrets Manager │    │ CloudWatch  │    │   │
│  │   │  dev-app-repo   │    │  4 Secrets      │    │ Log Group   │    │   │
│  │   └─────────────────┘    └─────────────────┘    └─────────────┘    │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         IAM Roles                                    │   │
│  │   - EKS Cluster Role (cluster management)                            │   │
│  │   - EKS Node Role (worker nodes + ECR pull)                         │   │
│  │   - AWS Load Balancer Controller IRSA role                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
terraform/
├── versions.tf                   # Terraform & provider version constraints (root)
├── providers.tf                  # AWS provider configuration (root)
├── variables.tf                  # Root-level variables
├── outputs.tf                    # Root-level outputs
├── env/
│   ├── dev/                      # Development environment
│   │   ├── backend.tf            # S3 remote state backend
│   │   ├── main.tf               # Environment module orchestration (10 modules)
│   │   ├── variables.tf          # Environment-specific variables
│   │   ├── outputs.tf            # Environment outputs
│   │   ├── providers.tf          # AWS, Kubernetes, Helm providers
│   │   ├── terraform.tfvars      # Variable values
│   │   └── versions.tf           # Provider version constraints
│   └── prod/                     # Production environment (WIP)
│       ├── main.tf               # Environment module orchestration
│       └── terraform.tfvars      # Variable values
└── modules/
    ├── network/                  # VPC, Subnets, IGW, Route Tables
    ├── security/                 # Security Groups (ALB + EKS nodes)
    ├── secrets/                  # AWS Secrets Manager (4 app secrets)
    ├── iam/                      # IAM Roles for EKS cluster + nodes
    ├── cloudwatch/               # CloudWatch Log Group
    ├── ecr/                      # Elastic Container Registry
    ├── alb/                      # Application Load Balancer + Target Group
    ├── eks/                      # EKS cluster, node group, OIDC provider
    ├── alb_controller/           # AWS Load Balancer Controller (IRSA + Helm)
    └── k8s_app/                  # Kubernetes workload (deployment, service, TGB)
```

---

## Module Dependency Graph

```
                  ┌─────────┐
                  │ network │
                  └────┬────┘
        ┌───────────────┼───────────────────────┐
        ▼               ▼                       ▼
   ┌──────────┐   ┌──────────┐          ┌──────────┐
   │ security │   │   alb    │          │   eks    │
   └────┬─────┘   └────┬─────┘          └────┬─────┘
        │              │                     │
        │         (target_group_arn)    (oidc_provider_arn
        │              │                 oidc_provider_url
        │              │                 cluster_name)
        │              │                     │
        │              │              ┌──────▼──────────┐
        │              │              │  alb_controller │
        │              │              └──────┬──────────┘
        │              │                     │
        │              └──────────────┐      │ (helm_release_name)
        │                             ▼      ▼
        │                         ┌──────────────┐
        └────────────────────────►│   k8s_app    │
    (via secrets + ecr outputs)   └──────────────┘

Independent modules (no cross-dependencies):
  iam · secrets · cloudwatch · ecr
```

---

## Environment Layout

The Terraform configuration follows a **module-based, multi-environment** pattern:

| Component | Purpose |
|-----------|---------|
| **Root Config** (`terraform/*.tf`) | Shared version constraints, provider settings, common variables |
| **Environment Config** (`terraform/env/<env>/`) | Per-environment orchestration, state backend, variable overrides |
| **Modules** (`terraform/modules/<module>/`) | Reusable, single-responsibility infrastructure components |

Each module has **exactly one responsibility** and exposes its outputs for other modules to consume. No module contains resources belonging to a different concern.

---

## State Management

Remote state is stored in **Amazon S3** with **DynamoDB** state locking for the `dev` environment.

### Dev Backend (`terraform/env/dev/backend.tf`)

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-bucket-468997136367-us-east-1-an"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

| Setting | Value | Description |
|---------|-------|-------------|
| `bucket` | `terraform-state-bucket-468997136367-us-east-1-an` | S3 bucket for state storage |
| `key` | `dev/terraform.tfstate` | State file path within bucket |
| `region` | `us-east-1` | AWS region for state resources |
| `dynamodb_table` | `terraform-locks` | Lock table to prevent concurrent runs |
| `encrypt` | `true` | Server-side encryption enabled |

> **Note:** The `prod` environment backend is not yet configured.

---

## Modules

### network

**Purpose:** Creates the VPC networking layer including subnets, internet gateway, and route tables.

**Resources:**
- `aws_vpc` — VPC with DNS support enabled
- `aws_internet_gateway` — Internet gateway for public internet access
- `aws_subnet` (×2) — Public subnets with auto-assigned public IPs
- `aws_route_table` — Public route table with default route to IGW
- `aws_route_table_association` (×2) — Subnet-to-route-table associations

**Key Design Decision:** EKS worker nodes run in **public subnets** to avoid NAT Gateway costs. Subnets are tagged for the AWS Load Balancer Controller (`kubernetes.io/role/elb` and `kubernetes.io/cluster/<cluster-name>`). This is suitable for dev but should be revisited for production.

**Variables:**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `vpc_cidr` | `string` | `10.0.0.0/16` | VPC CIDR block |
| `public_subnet_cidrs` | `list(string)` | `["10.0.1.0/24", "10.0.2.0/24"]` | Public subnet CIDRs |
| `availability_zones` | `list(string)` | — | AZs for subnet placement |
| `environment` | `string` | — | Environment tag |
| `cluster_name` | `string` | `""` | EKS cluster name for required subnet tags |

**Outputs:**

| Output | Description |
|--------|-------------|
| `vpc_id` | ID of the created VPC |
| `public_subnet_ids` | List of public subnet IDs |

---

### security

**Purpose:** Defines security groups for the ALB and EKS worker nodes.

**Resources:**
- `aws_security_group.alb` — Allows inbound HTTP (port 80) from anywhere
- `aws_security_group.eks_nodes` — Allows inbound traffic on app port (3000) from ALB; allows node-to-node traffic

**Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `vpc_id` | `string` | VPC ID where security groups are created |
| `app_port` | `number` | Application container port |
| `environment` | `string` | Environment tag |

**Outputs:**

| Output | Description |
|--------|-------------|
| `alb_security_group_id` | Security group ID for the ALB |
| `eks_nodes_security_group_id` | Security group ID for EKS worker nodes |

---

### secrets

**Purpose:** Manages application secrets in AWS Secrets Manager.

**Resources (4 secrets):**

| Secret Name | Purpose |
|-------------|---------|
| `product-management/<env>/SECRET_KEY` | Application secret key |
| `product-management/<env>/SESSION_SECRET` | Session encryption secret |
| `product-management/<env>/PASSWORD_SECRET_KEY` | Password hashing secret |
| `product-management/<env>/DATABASE_CONNECTION` | Database connection string |

**Important:** All secrets are created with placeholder values (`"placeholder-change-in-aws-console"`). You **must** update the actual secret values via the AWS Console or CLI after deployment, then run `terraform apply` to sync them into the Kubernetes Secret.

**Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `environment` | `string` | Environment name for secret path |

**Outputs:**

| Output | Description |
|--------|-------------|
| `secret_key_arn` | ARN of SECRET_KEY secret |
| `session_secret_arn` | ARN of SESSION_SECRET secret |
| `password_secret_key_arn` | ARN of PASSWORD_SECRET_KEY secret |
| `db_connection_arn` | ARN of DATABASE_CONNECTION secret |
| `all_secret_arns` | Combined list of all secret ARNs |

---

### iam

**Purpose:** Creates IAM roles for the EKS cluster and managed node group.

**Resources:**
- `aws_iam_role.eks_cluster` — Assumed by the EKS control plane
- `aws_iam_role_policy_attachment.eks_cluster_policy` — Attaches `AmazonEKSClusterPolicy`
- `aws_iam_role.eks_node` — Assumed by EKS worker nodes
- `aws_iam_role_policy_attachment.eks_node_worker_policy` — Attaches `AmazonEKSWorkerNodePolicy`
- `aws_iam_role_policy_attachment.eks_node_cni_policy` — Attaches `AmazonEKS_CNI_Policy`
- `aws_iam_role_policy_attachment.eks_node_ecr_policy` — Attaches `AmazonEC2ContainerRegistryReadOnly`

**Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `environment` | `string` | Environment name |

**Outputs:**

| Output | Description |
|--------|-------------|
| `eks_cluster_role_arn` | ARN of EKS cluster role |
| `eks_node_role_arn` | ARN of EKS node group role |

---

### cloudwatch

**Purpose:** Creates CloudWatch Log Groups for application logs.

**Resources:**
- `aws_cloudwatch_log_group.app` — Log group with configurable retention

**Variables:**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `log_group_name` | `string` | — | Name of the log group |
| `retention_in_days` | `number` | `30` | Log retention period |
| `environment` | `string` | — | Environment tag |

**Outputs:**

| Output | Description |
|--------|-------------|
| `log_group_name` | Name of the created log group |

---

### ecr

**Purpose:** Creates an Elastic Container Registry repository for Docker images.

**Resources:**
- `aws_ecr_repository.app` — ECR repo with image scanning on push

**Features:**
- `image_tag_mutability = "MUTABLE"` — Tags can be overwritten
- `force_delete = true` — Allows repository deletion even with images
- `scan_on_push = true` — Vulnerability scanning enabled

**Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `repository_name` | `string` | Name of the ECR repository |
| `environment` | `string` | Environment tag |

**Outputs:**

| Output | Description |
|--------|-------------|
| `repository_url` | URL for pushing/pulling images |
| `repository_arn` | ARN of the ECR repository |

---

### alb

**Purpose:** Creates an Application Load Balancer with target group and listener.

**Resources:**
- `aws_lb.main` — Public-facing ALB
- `aws_lb_target_group.main` — IP-based target group for EKS pods
- `aws_lb_listener.http` — HTTP listener on port 80 forwarding to target group

**Health Check Configuration:**

| Setting | Value |
|---------|-------|
| Path | `/` |
| Healthy threshold | 3 |
| Unhealthy threshold | 3 |
| Timeout | 5 seconds |
| Interval | 30 seconds |
| Matcher | `200-399` |

**Variables:**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `environment` | `string` | — | Environment name |
| `vpc_id` | `string` | — | VPC ID |
| `public_subnet_ids` | `list(string)` | — | Subnet IDs for ALB |
| `security_group_id` | `string` | — | ALB security group ID |
| `app_port` | `number` | `3000` | Target container port |

**Outputs:**

| Output | Description |
|--------|-------------|
| `alb_dns_name` | DNS name of the load balancer |
| `target_group_arn` | ARN of the target group |

---

### eks

**Purpose:** Provisions the EKS cluster, managed node group, OIDC provider, and cluster access entries. This module is **infrastructure-only** — it does not deploy Kubernetes workloads or install Helm charts.

**Resources:**
- `aws_eks_cluster.main` — EKS control plane
- `aws_launch_template.nodes` — Node launch template with security group
- `aws_eks_node_group.main` — Managed worker nodes
- `data.tls_certificate.eks` — Fetches the OIDC issuer certificate
- `aws_iam_openid_connect_provider.eks` — OIDC provider for IRSA
- `aws_eks_access_entry.admin` — Cluster access for Terraform and CI/CD principals
- `aws_eks_access_policy_association.admin` — Grants `AmazonEKSClusterAdminPolicy`

**Cluster Specs:**

| Attribute | Value |
|-----------|-------|
| Kubernetes version | `1.31` |
| Node instance type | `t3.small` |
| Node desired count | `1` |

**Variables:**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `environment` | `string` | — | Environment name |
| `cluster_version` | `string` | `"1.31"` | Kubernetes version |
| `subnet_ids` | `list(string)` | — | Subnet IDs for cluster and nodes |
| `node_security_group_id` | `string` | — | EKS nodes security group |
| `cluster_role_arn` | `string` | — | EKS cluster IAM role ARN |
| `node_role_arn` | `string` | — | EKS node group IAM role ARN |
| `node_instance_types` | `list(string)` | `["t3.small"]` | Node EC2 instance types |
| `node_desired_size` | `number` | `1` | Desired node count |
| `node_min_size` | `number` | `1` | Minimum node count |
| `node_max_size` | `number` | `2` | Maximum node count |
| `cluster_access_principal_arns` | `list(string)` | `[]` | Additional IAM ARNs for kubectl access |

**Outputs:**

| Output | Description |
|--------|-------------|
| `cluster_name` | Name of the EKS cluster |
| `cluster_endpoint` | EKS API server endpoint |
| `cluster_ca_certificate` | Cluster CA certificate (base64) |
| `cluster_security_group_id` | Security group created by EKS |
| `oidc_provider_arn` | ARN of the OIDC provider (for IRSA) |
| `oidc_provider_url` | OIDC URL without `https://` (for trust policy conditions) |

---

### alb_controller

**Purpose:** Installs the **AWS Load Balancer Controller** onto the EKS cluster. Creates an IRSA IAM role scoped to the `kube-system` service account and deploys the controller via Helm.

**Resources:**
- `aws_iam_role.aws_load_balancer_controller` — IRSA role with OIDC trust policy
- `aws_iam_policy.aws_load_balancer_controller` — Custom IAM policy (from `policies/aws-load-balancer-controller.json`)
- `aws_iam_role_policy_attachment` — Attaches policy to role
- `data.aws_subnet.selected` — Looks up VPC ID from subnet
- `helm_release.aws_load_balancer_controller` — Deploys chart `aws-load-balancer-controller` v1.11.0

**Providers required:** `aws`, `helm.eks` (aliased)

**Variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `environment` | `string` | Environment name |
| `aws_region` | `string` | AWS region |
| `cluster_name` | `string` | EKS cluster name |
| `oidc_provider_arn` | `string` | ARN of the OIDC provider (from `eks` module) |
| `oidc_provider_url` | `string` | OIDC URL without `https://` (from `eks` module) |
| `subnet_ids` | `list(string)` | Subnets used to look up the VPC ID |

**Outputs:**

| Output | Description |
|--------|-------------|
| `helm_release_name` | Name of the Helm release (used as dependency signal by `k8s_app`) |
| `irsa_role_arn` | ARN of the ALB Controller IRSA role |

---

### k8s_app

**Purpose:** Deploys the application workload to Kubernetes. Reads secrets from AWS Secrets Manager and creates all Kubernetes resources needed to run and expose the app.

**Resources:**
- `data.aws_secretsmanager_secret_version` (×4) — Fetches secret values for Kubernetes Secret
- `kubernetes_namespace.app` — Application namespace
- `kubernetes_secret.app` — Opaque secret synced from Secrets Manager
- `kubernetes_deployment.app` — Application Deployment with liveness/readiness probes
- `kubernetes_service.app` — ClusterIP Service
- `kubernetes_manifest.target_group_binding` — Registers pods with the ALB target group via `TargetGroupBinding`

**Providers required:** `aws`, `kubernetes.eks` (aliased)

**Container Configuration:**
- **Image:** Pulled from ECR with `:latest` tag
- **Port:** Configurable via `container_port`
- **Environment variables:** `PORT` + 4 secrets injected from Kubernetes Secret
- **Resources:** `250m`/`512Mi` requests, `500m`/`512Mi` limits
- **Probes:** HTTP liveness (`30s` delay, `10s` period) and readiness (`10s` delay, `5s` period) on `/`

**Variables:**

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `environment` | `string` | — | Environment name (used as namespace) |
| `container_image` | `string` | — | Full ECR image URL |
| `container_port` | `number` | — | Container port |
| `replicas` | `number` | `1` | Pod replica count |
| `target_group_arn` | `string` | — | ALB target group ARN |
| `secret_key_arn` | `string` | — | Secrets Manager ARN for SECRET_KEY |
| `session_secret_arn` | `string` | — | Secrets Manager ARN for SESSION_SECRET |
| `password_secret_key_arn` | `string` | — | Secrets Manager ARN for PASSWORD_SECRET_KEY |
| `db_connection_arn` | `string` | — | Secrets Manager ARN for DATABASE_CONNECTION |
| `alb_controller_helm_release_name` | `string` | `"aws-load-balancer-controller"` | ALB controller Helm release name (dependency signal) |

**Outputs:**

| Output | Description |
|--------|-------------|
| `namespace` | Kubernetes namespace name |
| `deployment_name` | Kubernetes Deployment name |
| `service_name` | Kubernetes Service name |

---

## Environment Configuration

### Dev Environment

**File:** `terraform/env/dev/`

The dev environment is fully configured and deployed. It orchestrates all 10 modules with the following settings:

| Setting | Value |
|---------|-------|
| Region | `us-east-1` |
| Environment | `dev` |
| App Port | `3000` |
| VPC CIDR | `10.0.0.0/16` |
| Public Subnets | `10.0.1.0/24`, `10.0.2.0/24` |
| Availability Zones | `us-east-1a`, `us-east-1b` |
| Pod Replicas | `1` |
| Node Instance Type | `t3.small` |

### Prod Environment

**File:** `terraform/env/prod/`

The prod environment is a **work in progress**. It currently has:
- Module references mirroring the dev layout (all 10 modules)
- Backend configuration not yet configured
- Variable overrides for `eu-central-1` region

**Prod Settings (from `terraform.tfvars`):**

| Setting | Value |
|---------|-------|
| Environment | `prod` |
| Region | `eu-central-1` |

---

## Variables

### Dev Environment Variables (`terraform/env/dev/variables.tf`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `aws_region` | `string` | `us-east-1` | AWS region |
| `environment` | `string` | `dev` | Environment name |
| `app_port` | `number` | `3000` | Application port |
| `vpc_cidr` | `string` | `10.0.0.0/16` | VPC CIDR |
| `public_subnet_cidrs` | `list(string)` | `["10.0.1.0/24", "10.0.2.0/24"]` | Subnet CIDRs |
| `availability_zones` | `list(string)` | `["us-east-1a", "us-east-1b"]` | AZs |
| `replicas` | `number` | `1` | Pod replica count |
| `cluster_access_principal_arns` | `list(string)` | `[]` | CI/CD IAM user/role ARNs for kubectl |

---

## Outputs

### Dev Environment Outputs (`terraform/env/dev/outputs.tf`)

| Output | Description |
|--------|-------------|
| `alb_dns_name` | DNS name of the load balancer (application URL) |
| `eks_cluster_name` | Name of the EKS cluster |
| `ecr_repository_url` | ECR repository URL for pushing images |
| `app_namespace` | Kubernetes namespace where the app is deployed |
| `app_deployment_name` | Name of the Kubernetes Deployment |

---

## Usage

### Build and Push Container Image

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build from project Dockerfile
docker build -t dev-app-repo .
docker tag dev-app-repo:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-app-repo:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/dev-app-repo:latest
```

### Initialize

```bash
cd terraform/env/dev
terraform init
```

### Plan

```bash
terraform plan
```

### Apply

```bash
terraform apply
```

### Configure kubectl

```bash
aws eks update-kubeconfig --name dev-eks-cluster --region us-east-1
kubectl get pods -n dev
```

### Destroy

```bash
terraform destroy
```

> **Warning:** The destroy workflow also exists as a GitHub Actions pipeline. See `CICD.md` for details.

### Migrating from ECS

If you previously deployed the ECS-based stack, `terraform apply` will destroy ECS resources and create EKS resources. Expect brief downtime during the migration.

---

## Prerequisites

1. **Terraform 1.7.0+** installed
2. **AWS CLI** configured with appropriate credentials
3. **kubectl** installed (for post-deploy verification and CD)
4. **Helm 3** (used by Terraform Helm provider during apply)
5. **S3 bucket** for remote state (must exist before `terraform init`)
6. **DynamoDB table** for state locking (must exist before `terraform init`)
7. **Secrets** updated in AWS Secrets Manager after first deployment
8. **ECR image** pushed before pods can start (build from project `Dockerfile`)
9. **CI/CD IAM principal** added to `cluster_access_principal_arns` for GitHub Actions kubectl access

---

## Security Considerations

| Consideration | Status | Notes |
|---------------|--------|-------|
| ALB uses HTTP (not HTTPS) | ⚠️ Dev only | Add ACM certificate and HTTPS listener for production |
| EKS nodes in public subnets | ⚠️ Cost optimization | Avoids NAT Gateway; acceptable for dev |
| Secrets use placeholder values | ⚠️ Post-deploy action | Must update via AWS Console, then re-apply Terraform |
| Secrets synced to K8s Secret | ⚠️ Dev trade-off | Secret values are stored in Terraform state; use External Secrets Operator for production |
| Security groups restrict ALB→pod traffic | ✅ | Nodes only accept app port traffic from ALB |
| ECR image scanning | ✅ | Enabled with `scan_on_push` |
| EKS access entries | ✅ | Explicit IAM principals for cluster admin |
| IRSA for ALB Controller | ✅ | Least-privilege role scoped to `kube-system` service account |
| State encryption | ✅ | S3 backend with `encrypt = true` |
| State locking | ✅ | DynamoDB table configured |

---

## Provider Configuration

### Versions (`terraform/env/dev/versions.tf`)

```hcl
terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.17"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}
```

### Default Tags

All resources are tagged with:

```hcl
default_tags {
  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

The `kubernetes.eks`, `helm.eks`, and `kubectl.eks` aliased providers are configured in `env/<env>/providers.tf` using the EKS cluster outputs and passed into the `alb_controller` and `k8s_app` modules via `providers` blocks in `main.tf`:

```hcl
module "alb_controller" {
  source    = "../../modules/alb_controller"
  providers = { helm.eks = helm.eks }
  ...
}

module "k8s_app" {
  source    = "../../modules/k8s_app"
  providers = {
    kubernetes.eks = kubernetes.eks
    kubectl.eks    = kubectl.eks
  }
  ...
}
```

### CI/CD Deployment

The GitHub Actions CD workflow (`.github/workflows/cd.yml`) deploys to EKS after pushing a new image:

1. Runs `terraform apply` to ensure infrastructure is up to date
2. Builds and pushes the Docker image to ECR
3. Runs `kubectl set image` to update the Deployment
4. Waits for rollout and verifies ALB health

Ensure the GitHub Actions IAM user ARN is listed in `cluster_access_principal_arns` in your `terraform.tfvars`.
