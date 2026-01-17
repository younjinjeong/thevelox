import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Database
  MONGODB_URI: Joi.string().required(),
  MONGODB_NAME: Joi.string().default('velox'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),

  // Session & JWT
  SESSION_SECRET: Joi.string().min(32).required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // Google OAuth (optional for development)
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().allow('').optional(),

  // Storage Provider
  STORAGE_PROVIDER: Joi.string()
    .valid('openstack', 's3', 'gcs', 'minio')
    .required(),

  // OpenStack (conditional validation)
  OPENSTACK_AUTH_URL: Joi.string().when('STORAGE_PROVIDER', {
    is: 'openstack',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  OPENSTACK_TENANT_ID: Joi.string().when('STORAGE_PROVIDER', {
    is: 'openstack',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // AWS S3 (conditional validation)
  AWS_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_REGION: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  AWS_S3_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
    is: 's3',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // Google Cloud Storage (conditional validation)
  GCP_PROJECT_ID: Joi.string().when('STORAGE_PROVIDER', {
    is: 'gcs',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  GCP_KEY_FILE: Joi.string().when('STORAGE_PROVIDER', {
    is: 'gcs',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  GCS_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
    is: 'gcs',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // MinIO (conditional validation)
  MINIO_ENDPOINT: Joi.string().when('STORAGE_PROVIDER', {
    is: 'minio',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MINIO_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
    is: 'minio',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MINIO_SECRET_KEY: Joi.string().when('STORAGE_PROVIDER', {
    is: 'minio',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MINIO_BUCKET: Joi.string().when('STORAGE_PROVIDER', {
    is: 'minio',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  MINIO_USE_SSL: Joi.string().optional(),
  MINIO_REGION: Joi.string().optional(),

  // Email
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().optional(),

  // Security
  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(100),
  CORS_ORIGIN: Joi.string().default('*'),

  // Feature Flags
  FEATURE_S3_STORAGE: Joi.boolean().default(false),
  FEATURE_S3_STORAGE_PERCENTAGE: Joi.number().min(0).max(100).default(0),
  FEATURE_NEW_UPLOAD_UI: Joi.boolean().default(false),
  FEATURE_REALTIME_COLLABORATION: Joi.boolean().default(true),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
});
