variable "namespace" {
  description = "Kubernetes namespace for deployment"
  type        = string
}

variable "release_name" {
  description = "Name of the Helm release"
  type        = string
}

variable "chart_path" {
  description = "Path to the Helm chart"
  type        = string
}

variable "values_file" {
  description = "Path to Helm values file"
  type        = string
  default     = ""
}

variable "create_namespace" {
  description = "Whether to create the namespace"
  type        = bool
  default     = false
}

variable "config" {
  description = "Configuration values to override"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secret values to override"
  type        = map(string)
  default     = {}
  sensitive   = true
}
