resource "kubernetes_namespace" "this" {
  metadata {
    name = var.namespace_name
    labels = merge(
      {
        name = var.namespace_name
      },
      var.labels
    )
  }
}

output "namespace_name" {
  description = "The name of the created namespace"
  value       = kubernetes_namespace.this.metadata[0].name
}
