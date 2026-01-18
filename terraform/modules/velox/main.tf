resource "helm_release" "velox" {
  name             = var.release_name
  chart            = var.chart_path
  namespace        = var.namespace
  create_namespace = var.create_namespace
  wait             = true
  timeout          = 600

  # Load values from file
  values = var.values_file != "" ? [
    file(var.values_file)
  ] : []

  # Override configuration values
  dynamic "set" {
    for_each = var.config
    content {
      name  = "config.${set.key}"
      value = set.value
    }
  }

  # Override secret values
  dynamic "set_sensitive" {
    for_each = var.secrets
    content {
      name  = "secrets.${set_sensitive.key}"
      value = set_sensitive.value
    }
  }
}

output "release_name" {
  description = "The name of the Helm release"
  value       = helm_release.velox.name
}

output "release_status" {
  description = "The status of the Helm release"
  value       = helm_release.velox.status
}

output "release_version" {
  description = "The version of the Helm release"
  value       = helm_release.velox.version
}
