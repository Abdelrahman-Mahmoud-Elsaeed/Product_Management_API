terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    kubernetes = {
      source                = "hashicorp/kubernetes"
      configuration_aliases = [kubernetes.eks]
    }
    kubectl = {
      source                = "gavinbunney/kubectl"
      configuration_aliases = [kubectl.eks]
    }
  }
}
