# Velox Production Deployment Guide

This guide covers deploying the Velox backend to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Storage Configuration](#storage-configuration)
6. [Security Hardening](#security-hardening)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 18.x or 20.x LTS
- MongoDB 6.x or 7.x
- Redis 7.x
- Minimum 2GB RAM (4GB recommended)
- Minimum 20GB disk space

### Required Services

- MongoDB (Atlas, self-hosted, or managed)
- Redis (ElastiCache, self-hosted, or managed)
- Storage provider (AWS S3, Google Cloud Storage, Azure Blob, or Dropbox)

## Environment Setup

### 1. Clone and Install

```bash
git clone <repository-url> velox
cd velox
npm install --production
```

### 2. Environment Variables

Create a `.env.production` file:

```env
# Application
NODE_ENV=production
PORT=3000
APP_NAME=Velox
APP_URL=https://api.velox.com

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/velox?retryWrites=true&w=majority

# Redis
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Storage Provider (choose one)
STORAGE_PROVIDER=s3  # Options: s3, gcs, azure, dropbox

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=velox-files

# Google Cloud Storage
GCS_PROJECT_ID=your-project-id
GCS_KEYFILE_PATH=/path/to/keyfile.json
GCS_BUCKET=velox-files

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT=your-account-name
AZURE_STORAGE_ACCESS_KEY=your-access-key
AZURE_STORAGE_CONTAINER=velox-files

# Dropbox
DROPBOX_ACCESS_TOKEN=your-access-token
DROPBOX_APP_KEY=your-app-key
DROPBOX_APP_SECRET=your-app-secret

# CORS
CORS_ORIGIN=https://app.velox.com,https://www.velox.com

# Logging
LOG_LEVEL=info  # Options: error, warn, info, debug
```

### 3. Build Application

```bash
npm run build
```

## Database Setup

### MongoDB Configuration

1. **Create Database User**

```javascript
use admin
db.createUser({
  user: "velox",
  pwd: "secure-password",
  roles: [
    { role: "readWrite", db: "velox" }
  ]
})
```

2. **Create Indexes** (automatic on first run, but can be manually created)

```javascript
use velox

// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ name: 1 })

// Boxes collection
db.boxes.createIndex({ ownerId: 1 })
db.boxes.createIndex({ "members.userId": 1 })

// Files collection
db.storage_objects.createIndex({ boxId: 1 })
db.storage_objects.createIndex({ ownerId: 1 })
db.storage_objects.createIndex({ deleted: 1 })

// Activities collection (with TTL)
db.activities.createIndex({ timestamp: 1 }, { expireAfterSeconds: 15552000 }) // 180 days
db.activities.createIndex({ userId: 1, timestamp: -1 })

// Notifications collection (with TTL)
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }) // 90 days
db.notifications.createIndex({ userId: 1, read: 1 })
```

### Redis Configuration

Configure Redis for caching and sessions:

```bash
# Redis configuration file (redis.conf)
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## Application Deployment

### Option 1: PM2 (Recommended for VPS/Dedicated Servers)

1. **Install PM2 globally**

```bash
npm install -g pm2
```

2. **Create PM2 ecosystem file** (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [{
    name: 'velox-api',
    script: 'dist/main.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
  }]
}
```

3. **Start application**

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Generate startup script
```

4. **Monitor application**

```bash
pm2 status
pm2 logs
pm2 monit
```

### Option 2: Systemd Service (Linux)

1. **Create service file** (`/etc/systemd/system/velox.service`)

```ini
[Unit]
Description=Velox API Server
After=network.target

[Service]
Type=simple
User=velox
WorkingDirectory=/opt/velox
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=velox

[Install]
WantedBy=multi-user.target
```

2. **Enable and start service**

```bash
sudo systemctl enable velox
sudo systemctl start velox
sudo systemctl status velox
```

### Option 3: Platform as a Service (PaaS)

#### Heroku

1. Create `Procfile`:

```
web: node dist/main.js
```

2. Deploy:

```bash
heroku create velox-api
git push heroku main
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
# Set other environment variables
```

#### AWS Elastic Beanstalk

1. Install EB CLI:

```bash
pip install awsebcli
```

2. Initialize and deploy:

```bash
eb init -p node.js-18 velox-api
eb create velox-production
eb setenv NODE_ENV=production MONGODB_URI=your-uri
eb deploy
```

#### Google Cloud Platform (Cloud Run)

1. Create `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

2. Build and deploy:

```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/velox
gcloud run deploy velox --image gcr.io/PROJECT-ID/velox --platform managed
```

## Storage Configuration

### AWS S3 Setup

1. **Create S3 bucket**

```bash
aws s3 mb s3://velox-files --region us-east-1
```

2. **Configure bucket policy** (allow public read for certain paths)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::velox-files/public/*"
    }
  ]
}
```

3. **Enable CORS**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://app.velox.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Google Cloud Storage Setup

1. **Create bucket**

```bash
gsutil mb -l us-east1 gs://velox-files
```

2. **Set IAM permissions**

```bash
gsutil iam ch allUsers:objectViewer gs://velox-files/public
```

## Security Hardening

### 1. HTTPS/SSL Configuration

Use a reverse proxy (Nginx or Apache) with SSL:

**Nginx configuration** (`/etc/nginx/sites-available/velox`)

```nginx
server {
    listen 80;
    server_name api.velox.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.velox.com;

    ssl_certificate /etc/letsencrypt/live/api.velox.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.velox.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 2. Firewall Rules

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Block direct access to application port
sudo ufw deny 3000/tcp
```

### 3. Environment Security

- Store secrets in environment variables or secret management service (AWS Secrets Manager, Google Secret Manager)
- Never commit `.env` files to version control
- Rotate JWT secrets regularly
- Use strong database passwords
- Enable MongoDB authentication
- Restrict database access to application servers only

### 4. Application Security

- Rate limiting is enabled by default (100 requests per minute)
- Helmet middleware is configured for security headers
- CORS is restricted to specified origins
- JWT tokens expire after 1 hour (refresh tokens after 7 days)
- File upload size limits are enforced
- Input validation on all endpoints

## Monitoring & Logging

### 1. Application Logging

Logs are written to:
- `./logs/error.log` - Error logs
- `./logs/combined.log` - All logs

Configure log rotation:

```bash
# logrotate configuration
/opt/velox/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 velox velox
    sharedscripts
    postrotate
        pm2 reload velox-api
    endscript
}
```

### 2. Health Check Endpoints

- `GET /health` - Basic health check
- `GET /health/db` - Database connectivity
- `GET /health/storage` - Storage provider connectivity

### 3. Metrics Endpoint

- `GET /metrics` - Application metrics (requires authentication)
- `GET /metrics/requests` - Request statistics
- `GET /metrics/system` - System resource usage

### 4. External Monitoring

Set up monitoring with services like:
- **Datadog** - Full application monitoring
- **New Relic** - APM and monitoring
- **Sentry** - Error tracking
- **Pingdom** - Uptime monitoring

Example Sentry integration:

```bash
npm install @sentry/node
```

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

## Backup & Recovery

### Database Backups

**Automated MongoDB backups** (using `mongodump`):

```bash
#!/bin/bash
# backup-mongodb.sh

BACKUP_DIR="/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# Keep only last 30 days of backups
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;
```

Add to crontab:

```bash
0 2 * * * /opt/velox/scripts/backup-mongodb.sh
```

### File Storage Backups

Enable versioning on S3 bucket or use GCS bucket versioning.

## Performance Optimization

### 1. Caching Strategy

- Redis caching is enabled for:
  - User profile data (5 minutes)
  - Box metadata (10 minutes)
  - File metadata (5 minutes)

### 2. Database Optimization

- Ensure all indexes are created
- Use MongoDB connection pooling (default: 10 connections)
- Enable query profiling to identify slow queries:

```javascript
db.setProfilingLevel(1, { slowms: 100 })
```

### 3. Application Optimization

- Use cluster mode with PM2 to utilize all CPU cores
- Enable compression middleware for API responses
- Implement pagination for large data sets
- Use streaming for large file uploads/downloads

### 4. CDN Configuration

Serve static assets through a CDN (CloudFront, Cloudflare, etc.)

## Troubleshooting

### Common Issues

**1. Application won't start**

Check logs:
```bash
pm2 logs velox-api
# or
journalctl -u velox -n 100
```

**2. Database connection errors**

- Verify MongoDB URI is correct
- Check if MongoDB server is running
- Verify firewall rules allow connection
- Check database user permissions

**3. High memory usage**

- Monitor with `pm2 monit` or `htop`
- Restart application: `pm2 restart velox-api`
- Increase max memory restart threshold in PM2 config

**4. Slow API responses**

- Check `/metrics/requests` endpoint for slow queries
- Review database query performance
- Check Redis connection
- Verify storage provider latency

**5. WebSocket connection issues**

- Ensure Nginx/proxy is configured for WebSocket upgrade
- Check CORS configuration
- Verify firewall allows WebSocket connections

### Debug Mode

To enable debug logging temporarily:

```bash
pm2 restart velox-api --update-env --env production --log-date-format 'YYYY-MM-DD HH:mm:ss Z' --merge-logs
pm2 set velox-api:LOG_LEVEL debug
```

## Scaling Strategies

### Horizontal Scaling

1. **Load Balancer Setup** (Nginx, AWS ALB, GCP Load Balancer)
2. **Multiple Application Instances**
3. **Sticky Sessions** for WebSocket connections
4. **Shared Redis** for session storage
5. **Database Read Replicas** for read-heavy workloads

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Increase connection pool sizes

## Support

For issues or questions:
- GitHub Issues: <repository-url>/issues
- Documentation: <docs-url>
- Email: support@velox.com
