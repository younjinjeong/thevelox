# Kubernetes Deployment Guide

Complete guide for deploying Velox to Kubernetes using Helm charts and Terraform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start (Local Development)](#quick-start-local-development)
- [Deployment Options](#deployment-options)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Prerequisites

### Required Tools

1. **Docker Desktop** with Kubernetes enabled
   - Download from: https://www.docker.com/products/docker-desktop
   - Enable Kubernetes in Docker Desktop settings

2. **kubectl** - Kubernetes CLI
   ```bash
   # Check installation
   kubectl version --client
   ```

3. **Helm** - Kubernetes package manager (v3.x)
   ```bash
   # Install Helm
   # Windows (using Chocolatey):
   choco install kubernetes-helm

   # macOS (using Homebrew):
   brew install helm

   # Linux:
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

   # Verify installation
   helm version
   ```

4. **Terraform** (optional, for infrastructure as code)
   ```bash
   # Install Terraform
   # Windows (using Chocolatey):
   choco install terraform

   # macOS (using Homebrew):
   brew install terraform

   # Verify installation
   terraform version
   ```

### Verify Kubernetes Cluster

```bash
# Check cluster status
kubectl cluster-info

# Verify nodes
kubectl get nodes

# Expected output: docker-desktop node in Ready state
```

## Quick Start (Local Development)

### Option 1: Using Helm Directly (Recommended for Development)

#### Step 1: Build Docker Image

```bash
# Build the Docker image locally
./scripts/build-docker.sh

# Or manually:
docker build -t velox-backend:latest -f docker/Dockerfile .
```

#### Step 2: Configure AWS S3 Credentials (Optional)

Edit [helm/velox/values-dev.yaml](helm/velox/values-dev.yaml) and add your AWS credentials:

```yaml
secrets:
  awsAccessKeyId: "your-access-key"
  awsSecretAccessKey: "your-secret-key"
  awsS3Bucket: "your-bucket-name"
```

Or use environment variables during deployment.

#### Step 3: Deploy with Helm

```bash
# Run the deployment script
chmod +x scripts/deploy-local.sh
./scripts/deploy-local.sh

# Or manually:
# Add Bitnami repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Update chart dependencies
cd helm/velox
helm dependency update
cd ../..

# Install the chart
helm install velox ./helm/velox \
  --namespace velox-dev \
  --create-namespace \
  --values ./helm/velox/values-dev.yaml \
  --wait
```

#### Step 4: Access the Application

```bash
# Port forward to access locally
kubectl port-forward -n velox-dev svc/velox-velox 3000:3000

# Or use the helper script
chmod +x scripts/port-forward.sh
./scripts/port-forward.sh
```

Open browser: http://localhost:3000

### Option 2: Using Terraform

#### Step 1: Configure Terraform Variables

```bash
cd terraform/environments/local

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your configuration
# Set AWS credentials if using S3 storage
```

#### Step 2: Deploy with Terraform

```bash
# Run deployment script
chmod +x scripts/terraform-deploy.sh
./scripts/terraform-deploy.sh

# Or manually:
cd terraform/environments/local
terraform init
terraform plan
terraform apply
```

#### Step 3: Access the Application

Follow Step 4 from Option 1 above.

## Deployment Options

### Local Development (Docker Desktop)

- **Configuration File**: [helm/velox/values-dev.yaml](helm/velox/values-dev.yaml)
- **Resources**: Reduced (500m CPU, 512Mi RAM)
- **Replicas**: 1
- **Autoscaling**: Disabled
- **Storage**: 2Gi PVC

### Production (Cloud Kubernetes)

- **Configuration File**: [helm/velox/values-prod.yaml](helm/velox/values-prod.yaml)
- **Resources**: Production-grade (1000m CPU, 1Gi RAM)
- **Replicas**: 3 (with autoscaling 3-10)
- **Autoscaling**: Enabled (HPA)
- **Storage**: 100Gi PVC
- **Features**:
  - TLS/SSL with cert-manager
  - MongoDB replica set (3 nodes)
  - Redis replication (1 master + 2 replicas)
  - Pod Disruption Budget
  - Network Policies

## Configuration

### Helm Chart Structure

```
helm/velox/
├── Chart.yaml              # Chart metadata and dependencies
├── values.yaml             # Default values (production defaults)
├── values-dev.yaml         # Local development overrides
├── values-prod.yaml        # Production overrides
└── templates/
    ├── _helpers.tpl        # Template helpers
    ├── deployment.yaml     # Main application deployment
    ├── service.yaml        # ClusterIP service
    ├── ingress.yaml        # Ingress for external access
    ├── configmap.yaml      # Non-sensitive configuration
    ├── secret.yaml         # Sensitive credentials
    ├── serviceaccount.yaml # Service account
    ├── pvc.yaml            # Persistent volume for uploads
    └── hpa.yaml            # Horizontal Pod Autoscaler
```

### Key Configuration Options

#### Application Settings

```yaml
config:
  nodeEnv: development          # development | production
  port: 3000
  storageProvider: s3           # s3 | gcs | azure | openstack
  logLevel: debug               # debug | info | warn | error
  corsOrigin: "*"
```

#### Storage Providers

**AWS S3**:
```yaml
config:
  storageProvider: s3
secrets:
  awsAccessKeyId: "your-key"
  awsSecretAccessKey: "your-secret"
  awsRegion: "us-east-1"
  awsS3Bucket: "your-bucket"
```

**Google Cloud Storage**:
```yaml
config:
  storageProvider: gcs
secrets:
  gcpProjectId: "your-project"
  gcpKeyFile: "/path/to/key.json"
  gcsBucket: "your-bucket"
```

**Azure Blob Storage**:
```yaml
config:
  storageProvider: azure
secrets:
  azureStorageAccount: "your-account"
  azureStorageAccessKey: "your-key"
  azureStorageContainer: "your-container"
```

#### Resource Limits

Development:
```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi
```

Production:
```yaml
resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 1000m
    memory: 1Gi
```

### Environment Variables

All environment variables are configured via ConfigMap (non-sensitive) and Secret (sensitive):

**ConfigMap** ([helm/velox/templates/configmap.yaml](helm/velox/templates/configmap.yaml)):
- NODE_ENV
- PORT
- LOG_LEVEL
- SESSION_TTL
- RATE_LIMIT_TTL
- Feature flags

**Secret** ([helm/velox/templates/secret.yaml](helm/velox/templates/secret.yaml)):
- MONGODB_URI
- REDIS_PASSWORD
- JWT_SECRET
- SESSION_SECRET
- Storage provider credentials
- OAuth credentials
- SMTP credentials

## Troubleshooting

### Check Deployment Status

```bash
# View all resources
kubectl get all -n velox-dev

# Check pod status
kubectl get pods -n velox-dev

# Describe pod for events
kubectl describe pod <pod-name> -n velox-dev

# View logs
kubectl logs -n velox-dev -l app.kubernetes.io/name=velox -f
```

### Common Issues

#### 1. Image Pull Errors

**Symptom**: `ImagePullBackOff` or `ErrImagePull`

**Solution**:
```bash
# For local development, ensure image is built locally
./scripts/build-docker.sh

# Verify image exists
docker images | grep velox-backend

# Ensure imagePullPolicy is set to "Never" or "IfNotPresent" in values-dev.yaml
```

#### 2. MongoDB Connection Issues

**Symptom**: Application can't connect to MongoDB

**Solution**:
```bash
# Check MongoDB pod status
kubectl get pods -n velox-dev | grep mongodb

# View MongoDB logs
kubectl logs -n velox-dev <mongodb-pod-name>

# Verify connection string in secret
kubectl get secret velox -n velox-dev -o jsonpath='{.data.MONGODB_URI}' | base64 -d
```

#### 3. Redis Connection Issues

**Symptom**: Session storage errors

**Solution**:
```bash
# Check Redis pod status
kubectl get pods -n velox-dev | grep redis

# Test Redis connection
kubectl exec -it -n velox-dev <redis-pod-name> -- redis-cli ping
# Expected: PONG

# Verify Redis password
kubectl get secret velox -n velox-dev -o jsonpath='{.data.REDIS_PASSWORD}' | base64 -d
```

#### 4. PVC Pending

**Symptom**: PersistentVolumeClaim stuck in Pending state

**Solution**:
```bash
# Check PVC status
kubectl get pvc -n velox-dev

# Describe PVC for events
kubectl describe pvc velox-uploads -n velox-dev

# For Docker Desktop, ensure storage class is available
kubectl get storageclass
```

#### 5. Health Check Failures

**Symptom**: Pods restarting due to failed probes

**Solution**:
```bash
# Check readiness/liveness probe settings
kubectl describe pod <pod-name> -n velox-dev

# Manually test health endpoint
kubectl exec -it <pod-name> -n velox-dev -- curl http://localhost:3000/health

# Adjust probe timings in values.yaml if needed
```

### Debugging Commands

```bash
# Execute shell in pod
kubectl exec -it <pod-name> -n velox-dev -- /bin/sh

# View environment variables
kubectl exec <pod-name> -n velox-dev -- env

# Check DNS resolution
kubectl exec <pod-name> -n velox-dev -- nslookup velox-mongodb

# Port forward for direct testing
kubectl port-forward <pod-name> -n velox-dev 3000:3000
```

## Production Deployment

### Prerequisites for Production

1. **Kubernetes Cluster** (AKS, EKS, GKE, or self-managed)
2. **Ingress Controller** (nginx-ingress)
3. **Cert-Manager** (for TLS certificates)
4. **External Secrets Operator** (recommended for secret management)
5. **Monitoring** (Prometheus + Grafana)

### Production Deployment Steps

#### 1. Install Required Components

```bash
# Install nginx-ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Install External Secrets Operator (optional but recommended)
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace
```

#### 2. Configure Production Values

Create a custom values file for your production environment:

```bash
cp helm/velox/values-prod.yaml helm/velox/values-prod-custom.yaml
```

Edit `values-prod-custom.yaml`:

```yaml
# Update domain
ingress:
  hosts:
    - host: velox.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: velox-tls
      hosts:
        - velox.yourdomain.com

# Update CORS origin
config:
  corsOrigin: "https://yourdomain.com"

# IMPORTANT: Use external secret management
# DO NOT commit production secrets to git
```

#### 3. Set Up External Secrets (Recommended)

Instead of storing secrets in values files, use External Secrets Operator with AWS Secrets Manager, Google Secret Manager, or Azure Key Vault.

#### 4. Deploy to Production

```bash
# Create production namespace
kubectl create namespace velox-prod

# Deploy with Helm
helm upgrade --install velox ./helm/velox \
  --namespace velox-prod \
  --values ./helm/velox/values-prod-custom.yaml \
  --wait \
  --timeout 15m

# Verify deployment
kubectl get all -n velox-prod
```

#### 5. Configure DNS

Point your domain to the ingress load balancer:

```bash
# Get ingress external IP
kubectl get ingress -n velox-prod

# Create A record: velox.yourdomain.com -> EXTERNAL-IP
```

#### 6. Monitor Deployment

```bash
# Watch pod status
kubectl get pods -n velox-prod -w

# View logs
kubectl logs -n velox-prod -l app.kubernetes.io/name=velox -f --tail=100

# Check HPA status
kubectl get hpa -n velox-prod
```

### Production Checklist

- [ ] Secrets stored in external secret manager (not in values files)
- [ ] TLS certificates configured via cert-manager
- [ ] Resource limits and requests properly set
- [ ] Horizontal Pod Autoscaler enabled
- [ ] Pod Disruption Budget configured
- [ ] Network Policies enabled
- [ ] MongoDB running in replica set mode (3+ nodes)
- [ ] Redis running with replication
- [ ] Persistent volumes configured with production storage class
- [ ] Monitoring and alerting set up
- [ ] Backup strategy implemented
- [ ] DNS configured correctly
- [ ] CORS origins restricted to production domains
- [ ] Rate limiting configured appropriately
- [ ] Security scanning enabled in CI/CD

## Cleanup

### Uninstall Helm Release

```bash
# Development
helm uninstall velox -n velox-dev

# Delete namespace (optional)
kubectl delete namespace velox-dev
```

### Destroy Terraform Deployment

```bash
cd terraform/environments/local
terraform destroy
```

## Additional Resources

- [Helm Documentation](https://helm.sh/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)
- [Docker Desktop Kubernetes](https://docs.docker.com/desktop/kubernetes/)

## Support

For issues and questions:
- Check [Troubleshooting](#troubleshooting) section
- Review application logs: `kubectl logs -n velox-dev -l app.kubernetes.io/name=velox`
- Check GitHub Issues: https://github.com/yourusername/thevelox/issues
