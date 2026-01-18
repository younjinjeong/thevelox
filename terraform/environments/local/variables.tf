variable "namespace" {
  description = "Kubernetes namespace for Velox deployment"
  type        = string
  default     = "velox-dev"
}

variable "release_name" {
  description = "Helm release name"
  type        = string
  default     = "velox"
}

variable "chart_path" {
  description = "Path to Helm chart"
  type        = string
  default     = "../../../helm/velox"
}

variable "values_file" {
  description = "Path to Helm values file"
  type        = string
  default     = "../../../helm/velox/values-dev.yaml"
}

# AWS S3 Configuration (for local development)
variable "aws_access_key_id" {
  description = "AWS Access Key ID for S3 storage"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key for S3 storage"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region for S3 bucket"
  type        = string
  default     = "us-east-1"
}

variable "aws_s3_bucket" {
  description = "S3 bucket name for file storage"
  type        = string
  default     = ""
}
