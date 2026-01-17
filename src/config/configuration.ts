import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // Application
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    uri: process.env.MONGODB_URI,
    name: process.env.MONGODB_NAME,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },

  // Session & JWT
  session: {
    secret: process.env.SESSION_SECRET,
    ttl: parseInt(process.env.SESSION_TTL || '86400', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
  },

  // Storage Configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'openstack', // openstack | s3 | gcs | minio

    // OpenStack Swift
    openstack: {
      authUrl: process.env.OPENSTACK_AUTH_URL,
      tenantId: process.env.OPENSTACK_TENANT_ID,
      username: process.env.OPENSTACK_USERNAME,
      password: process.env.OPENSTACK_PASSWORD,
    },

    // AWS S3
    s3: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET,
    },

    // Google Cloud Storage
    gcs: {
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GCP_KEY_FILE,
      bucket: process.env.GCS_BUCKET,
    },

    // MinIO (S3-compatible)
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
      bucket: process.env.MINIO_BUCKET || 'velox',
      useSSL: process.env.MINIO_USE_SSL === 'true',
      region: process.env.MINIO_REGION || 'us-east-1',
    },
  },

  // Email (SMTP)
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    from: process.env.EMAIL_FROM || 'Velox <noreply@thevelox.com>',
  },

  // External Services
  bitly: {
    user: process.env.BITLY_USER,
    apiKey: process.env.BITLY_API_KEY,
  },
  googleAnalytics: {
    trackingCode: process.env.GOOGLE_ANALYTICS_CODE,
  },

  // Security
  security: {
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },

  // Feature Flags
  features: {
    s3Storage: process.env.FEATURE_S3_STORAGE === 'true',
    s3StoragePercentage: parseInt(process.env.FEATURE_S3_STORAGE_PERCENTAGE || '0', 10),
    newUploadUi: process.env.FEATURE_NEW_UPLOAD_UI === 'true',
    realtimeCollaboration: process.env.FEATURE_REALTIME_COLLABORATION === 'true',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
}));
