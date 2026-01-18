terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

# Configure Kubernetes provider for Docker Desktop
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = "docker-desktop"
}

# Configure Helm provider
provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = "docker-desktop"
  }
}

# Create namespace for Velox
module "namespace" {
  source = "../../modules/namespace"

  namespace_name = var.namespace
  labels = {
    environment = "local"
    managed_by  = "terraform"
  }
}

# Deploy Velox application with Helm
module "velox" {
  source = "../../modules/velox"

  namespace        = module.namespace.namespace_name
  release_name     = var.release_name
  chart_path       = var.chart_path
  values_file      = var.values_file
  create_namespace = false

  # Development configuration
  config = {
    nodeEnv         = "development"
    storageProvider = "s3"
    logLevel        = "debug"
  }

  # Development secrets - NEVER use in production
  secrets = {
    sessionSecret      = "dev-session-secret-for-local-development-only"
    jwtSecret          = "dev-jwt-secret-for-local-development-only"
    awsAccessKeyId     = var.aws_access_key_id
    awsSecretAccessKey = var.aws_secret_access_key
    awsRegion          = var.aws_region
    awsS3Bucket        = var.aws_s3_bucket
  }

  depends_on = [module.namespace]
}

# Outputs
output "namespace" {
  description = "Kubernetes namespace"
  value       = module.namespace.namespace_name
}

output "release_name" {
  description = "Helm release name"
  value       = module.velox.release_name
}

output "service_name" {
  description = "Kubernetes service name"
  value       = "${var.release_name}-velox"
}

output "ingress_host" {
  description = "Ingress hostname"
  value       = "velox.local"
}
