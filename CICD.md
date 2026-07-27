# CI/CD Pipeline Documentation

## Overview

This document describes the **Continuous Integration (CI)**, **Continuous Deployment (CD)**, and **Destroy** GitHub Actions pipelines for the **Product Management API**.

All pipelines are triggered **manually** (`workflow_dispatch`) — they do not run automatically on push or pull request. This gives full control over when builds, deployments, and teardowns happen.

---

## Table of Contents

- [Pipeline Summary](#pipeline-summary)
- [Workflow Files](#workflow-files)
- [Required Secrets](#required-secrets)
- [GitHub Environment Setup](#github-environment-setup)
- [CI Pipeline](#ci-pipeline)
- [CD Pipeline](#cd-pipeline)
- [Destroy Pipeline](#destroy-pipeline)
- [Deployment Flow Diagram](#deployment-flow-diagram)
- [Security Scanning Tools](#security-scanning-tools)
- [Troubleshooting](#troubleshooting)

---

## Pipeline Summary

| Pipeline | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `ci.yml` | Manual | Build, test, lint, and security scan the code and infrastructure |
| **CD** | `cd.yml` | Manual | Build & push image, apply Terraform, deploy to EKS |
| **Destroy** | `destroy.yml` | Manual (with confirmation) | Tear down all AWS infrastructure |

---

## Workflow Files

```
.github/
└── workflows/
    ├── ci.yml        # Continuous Integration
    ├── cd.yml        # Continuous Deployment
    └── destroy.yml   # Infrastructure Teardown
```

---

## Required Secrets

Configure these in your GitHub repository under **Settings → Secrets and variables → Actions**:

| Secret | Description | Used By |
|--------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | IAM user access key for AWS API access | CD, Destroy |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key for AWS API access | CD, Destroy |
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions | CI (Gitleaks, SARIF upload) |

### IAM Permissions Required

The IAM user behind `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` needs the following AWS permissions:

- **ECR:** `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`
- **EKS:** `eks:DescribeCluster`, `eks:UpdateKubeconfig`
- **S3:** Read/Write on the Terraform state bucket
- **DynamoDB:** Read/Write on the Terraform lock table
- **Full infrastructure permissions** for all resources managed by Terraform (VPC, EKS, IAM, ALB, ECR, Secrets Manager, CloudWatch)

> [!IMPORTANT]
> The IAM user ARN **must** be added to `cluster_access_principal_arns` in `terraform/env/dev/terraform.tfvars` so that `kubectl` commands from GitHub Actions are authorized against the EKS cluster.

---

## GitHub Environment Setup

The **Destroy** pipeline uses a GitHub **Environment** named `production` to require manual reviewer approval before any teardown can proceed.

### Setup Steps

1. Go to your repository → **Settings** → **Environments**
2. Click **New environment** → name it `production`
3. Under **Deployment protection rules**, enable **Required reviewers**
4. Add yourself or your team as required reviewers
5. Click **Save protection rules**

Once configured, any `destroy.yml` run will pause and wait for a reviewer to approve it in the GitHub Actions UI before the job executes.

---

## CI Pipeline

**File:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

**Trigger:** Manual (`workflow_dispatch`)

**Purpose:** Validates code quality, runs tests, and performs comprehensive security scanning across the application code, dependencies, Docker image, and Terraform infrastructure.

### Steps

```
1.  Checkout Code
2.  Setup Node.js 20 (with npm cache)
3.  Install Dependencies        npm ci
4.  Lint                        npm run lint
5.  Unit Tests                  npm test
6.  Build Application           npm run build
7.  Secret Scanning             Gitleaks
8.  Dependency Scanning         npm audit --audit-level=high --omit=dev
9.  SAST Scanning               Semgrep (CLI via pip install)
10. Terraform Setup             hashicorp/setup-terraform@v3 (v1.7.0)
11. Terraform Format Check      terraform fmt -check -recursive terraform/
12. Terraform Init & Validate   terraform init -backend=false && terraform validate
13. Terraform Security Scan     Checkov (bridgecrewio/checkov-action@v12)
14. Build Docker Image          docker build -t test-app:local .
15. Container Image Scan        Trivy (aquasecurity/trivy-action@v0.36.0)
16. Upload SARIF Results        github/codeql-action/upload-sarif@v3
```

### Step Details

#### Step 7 — Secret Scanning (Gitleaks)
Scans the entire git history and all files for accidentally committed secrets (API keys, passwords, tokens). Fails the pipeline if any secrets are detected.

#### Step 8 — Dependency Scanning (npm audit)
Checks all production npm dependencies for known vulnerabilities (omitting `devDependencies` via `--omit=dev` to avoid blocking on build/test tool vulnerabilities that do not deploy to production). Fails on `HIGH` or `CRITICAL` severity findings.

#### Step 9 — SAST Scanning (Semgrep)
Static Application Security Testing — analyzes source code for security vulnerabilities, bad patterns, and bugs. Installed directly via pip and executed locally in the workspace.

#### Step 12 — Terraform Validate
Runs with `-backend=false` so no AWS credentials or S3 state bucket are required. Validates HCL syntax and module references only.

#### Step 13 — Checkov
Scans the entire `terraform/` directory including all modules for security misconfigurations (e.g. unencrypted resources, open security groups, missing logging). Set to `soft_fail: true` — findings are **reported but do not block** the pipeline. Review results in the Actions run log.

#### Steps 15 & 16 — Trivy + SARIF Upload
Scans the built Docker image for `CRITICAL` and `HIGH` CVEs in OS packages and application libraries. Results are uploaded to **GitHub Security → Code scanning alerts** for tracking over time.

### Pipeline Permissions

| Permission | Level | Reason |
|------------|-------|--------|
| `contents: read` | Workflow | Checkout repository |
| `security-events: write` | Workflow | Upload Trivy SARIF to GitHub Security |

---

## CD Pipeline

**File:** [`.github/workflows/cd.yml`](.github/workflows/cd.yml)

**Trigger:** Manual (`workflow_dispatch`)

**Purpose:** Deploys a new version of the application to AWS. Builds and pushes a new Docker image to ECR, applies any Terraform infrastructure changes, updates the Kubernetes deployment with the new image, and verifies the application is healthy.

### Environment Variables (Job Level)

| Variable | Value | Description |
|----------|-------|-------------|
| `AWS_REGION` | `us-east-1` | AWS region for all operations |
| `ECR_REPOSITORY` | `dev-app-repo` | ECR repository name |
| `EKS_CLUSTER` | `dev-eks-cluster` | EKS cluster name |
| `K8S_NAMESPACE` | `dev` | Kubernetes namespace |
| `K8S_DEPLOYMENT` | `dev-app` | Kubernetes Deployment name |
| `K8S_CONTAINER` | `dev-app` | Container name inside the Deployment |
| `TF_WORKING_DIR` | `terraform/env/dev` | Terraform working directory |

### Steps

```
1.  Checkout Code
2.  Configure AWS Credentials
3.  Login to Amazon ECR
4.  Setup Terraform
5.  Terraform Init
6.  Terraform Plan                       -out=tfplan
7.  Terraform Apply                      -auto-approve tfplan
8.  Build & Push Docker Image to ECR    ← image:sha + image:latest
9.  Install kubectl
10. Deploy to Amazon EKS                 kubectl set image + rollout status
11. Debug — Pod Events & Logs            (only runs on failure)
12. ALB Health Check                     20 retries × 15s = 5 min max
13. Deployment Summary                   Written to GitHub Actions run page
```

### Ordering — Terraform Before Image Build & Push

> [!IMPORTANT]
> The Terraform infrastructure (including the ECR Repository itself) must be provisioned **before** the Docker image is built and pushed. If the image step ran first, pushing to ECR would fail on clean setup because the target repository would not yet exist.

**Correct order:**
```
terraform apply → Build image → Push :sha + :latest tags → kubectl set image
```

### Image Tagging & Lifecycle Strategy

Each deployment pushes **two tags** to ECR:

| Tag | Example | Purpose |
|-----|---------|---------|
| Git SHA | `abc1234...` | Unique, immutable reference — used by `kubectl set image` |
| `latest` | `latest` | Floating tag — used by Terraform as the stable reference |

To prevent `terraform apply` from resetting the image tag back to `:latest` on subsequent pipeline runs, the Kubernetes Deployment resource is configured with a Terraform `lifecycle` block:

```hcl
  lifecycle {
    ignore_changes = [
      spec[0].template[0].spec[0].container[0].image,
    ]
  }
```

This ensures that Terraform manages the initial container deployment block, while your CD pipeline dynamically manages the active runtime image tags via `kubectl set image` without double rolling the pods.

### Health Check Logic

After a successful rollout, the pipeline polls the ALB's DNS endpoint for up to **5 minutes** (20 retries × 15 seconds):

```bash
# Accepts any HTTP 2xx or 3xx response (matches ALB matcher: 200-399)
if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 400 ]]; then
  echo "Health check passed"
  exit 0
fi
```

### Failure Debugging (Step 11)

If `kubectl rollout status` fails, Step 11 automatically runs and prints:
- Last 30 Kubernetes events in the namespace (sorted by time)
- Pod status and node assignment (`kubectl get pods -o wide`)
- Last 100 lines of container logs from the previous pod (`--previous`)

### Pipeline Permissions

| Permission | Level | Reason |
|------------|-------|--------|
| `contents: read` | Workflow | Checkout repository |

---

## Destroy Pipeline

**File:** [`.github/workflows/destroy.yml`](.github/workflows/destroy.yml)

**Trigger:** Manual (`workflow_dispatch`) with required text confirmation

**Purpose:** Completely destroys all AWS infrastructure provisioned by Terraform for the `dev` environment. This is irreversible.

### Safety Gates

The destroy pipeline has **two layers of protection**:

#### Gate 1 — Text Confirmation
When triggering the workflow, you must type `destroy` exactly in the confirmation input field. Any other value immediately aborts the job before AWS credentials are even configured.

```
Input: "Type 'destroy' to confirm..."
✅ destroy     → proceeds
❌ DESTROY     → aborted
❌ yes         → aborted
❌ (empty)     → aborted (field is required)
```

#### Gate 2 — GitHub Environment Approval
The job runs in the `production` GitHub Environment. If you have configured required reviewers (see [GitHub Environment Setup](#github-environment-setup)), a second person must approve the run in the GitHub Actions UI before the job executes.

### Steps

```
1. Validate Confirmation    Aborts if input ≠ "destroy"
2. Checkout Code
3. Configure AWS Credentials
4. Setup Terraform
5. Terraform Init
6. Terraform Destroy        -auto-approve
7. Destroy Summary          Reports success/failure to Actions run page
```

> [!CAUTION]
> `terraform destroy -auto-approve` will **permanently delete** the EKS cluster, VPC, ALB, ECR repository (and all images in it), Secrets Manager secrets, CloudWatch log groups, and all IAM roles. This cannot be undone.

---

## Deployment Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    GitHub Actions Runner                      │
│                                                              │
│  MANUAL TRIGGER                                              │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │              CD Pipeline                    │            │
│  │                                             │            │
│  │  1. Configure AWS Credentials               │            │
│  │  2. Login to ECR                            │            │
│  │  3. docker build + push :sha + :latest ──►──┼──► ECR     │
│  │  4. terraform init                          │            │
│  │  5. terraform plan                          │            │
│  │  6. terraform apply ────────────────────────┼──► AWS     │
│  │       └─ eks module (cluster)               │    (EKS,   │
│  │       └─ alb_controller module (Helm)       │    ALB,    │
│  │       └─ k8s_app module (deployment)        │    ECR,    │
│  │  7. kubectl set image :sha ─────────────────┼──► EKS     │
│  │  8. kubectl rollout status (5m timeout)     │            │
│  │  9. ALB health check (5 min, 200-399) ◄─────┼─── ALB     │
│  │  10. Deployment Summary                     │            │
│  └─────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

---

## Security Scanning Tools

| Tool | Type | Target | Blocks Pipeline? |
|------|------|--------|-----------------|
| **Gitleaks** | Secret detection | Git history + all files | ✅ Yes |
| **npm audit** | SCA (dependency CVEs) | `node_modules` (prod only) | ✅ Yes (`HIGH`+) |
| **Semgrep** | SAST (code patterns) | Source code (TypeScript) | ✅ Yes |
| **Checkov** | IaC security | `terraform/` (all modules) | ⚠️ No (soft fail) |
| **Trivy** | Container CVEs | Built Docker image | ✅ Yes (`HIGH`+) |

> [!NOTE]
> Checkov findings are intentionally set to `soft_fail: true`. This means security issues are reported in the Actions log and GitHub Security tab, but the pipeline continues. This avoids blocking deployments for known accepted risks (e.g. EKS nodes in public subnets — a documented cost trade-off in `TERRAFORM.md`). Review Checkov output regularly.

---

## Troubleshooting

### CD fails at "Terraform Apply" — backend not initialized
**Cause:** S3 bucket or DynamoDB table for Terraform state does not exist.  
**Fix:** Create the S3 bucket (`terraform-state-bucket-468997136367-us-east-1-an`) and DynamoDB table (`terraform-locks`) manually before the first deployment. See `TERRAFORM.md → State Management`.

### CD fails at "Deploy to Amazon EKS" — Unauthorized
**Cause:** The GitHub Actions IAM user is not in `cluster_access_principal_arns`.  
**Fix:** Add the IAM user ARN to `terraform/env/dev/terraform.tfvars`:
```hcl
cluster_access_principal_arns = ["arn:aws:iam::<account-id>:user/github-actions"]
```
Then run CD again — `terraform apply` will register the access entry.

### CD fails at "kubectl rollout status" — ImagePullBackOff
**Cause:** EKS nodes cannot pull the image from ECR (IAM permissions on the node role).  
**Fix:** Verify the `AmazonEC2ContainerRegistryReadOnly` policy is attached to the node IAM role (managed by `terraform/modules/iam`). Run `terraform apply` to re-sync.

### CD health check times out — all 20 retries fail
**Cause:** ALB target group deregistration/registration takes longer than 5 minutes, or the app is crashing on startup.  
**Fix:** Check Step 11 (Debug) output for pod events and logs. Common causes:
- Missing or wrong secret values in Secrets Manager (update via AWS Console, then re-apply)
- Application crashing on startup — check container logs
- Security group blocking traffic from ALB to EKS nodes

### Destroy fails — "resource still has dependencies"
**Cause:** Some AWS resources have manual dependencies that Terraform doesn't know about (e.g. manually created resources referencing the VPC).  
**Fix:** Manually delete the blocking resource in the AWS Console, then re-run the Destroy pipeline.

### CI Checkov reports failures
**Cause:** Checkov detected IaC security misconfigurations.  
**Fix:** Review findings in the Actions log. Known accepted risks are documented in `TERRAFORM.md → Security Considerations`. For new findings, either fix the Terraform code or add a Checkov suppression comment (`# checkov:skip=CKV_...`) with a justification.
