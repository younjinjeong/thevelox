# Getting Started with Modernized Velox

This guide will help you get started with the modernized Velox codebase.

## Prerequisites

- **Node.js**: 20.x LTS or higher
- **npm**: 10.x or higher
- **MongoDB**: 7.x or higher
- **Redis**: 7.x or higher
- **Storage Provider**: OpenStack Swift, AWS S3, or Google Cloud Storage

## Installation

### 1. Install Dependencies

The project is currently in transition. We have two package.json files:

- `package.json` - Legacy dependencies (for reference)
- `package-new.json` - Modernized dependencies

To install modernized dependencies:

```bash
# Backup old package.json
mv package.json package-legacy.json

# Use new package.json
mv package-new.json package.json

# Install dependencies
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set the required values:

```env
# Required configurations
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/velox
SESSION_SECRET=your-session-secret-minimum-32-characters
JWT_SECRET=your-jwt-secret-minimum-32-characters

# Storage Provider (choose one: openstack | s3 | gcs)
STORAGE_PROVIDER=s3

# For S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=velox-files
```

### 3. Set Up Database

Make sure MongoDB is running:

```bash
# Check if MongoDB is running
mongosh

# Create database (it will be created automatically on first use)
# But you can pre-create it if needed:
use velox
```

### 4. Set Up Redis

Make sure Redis is running:

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

## Development

### Running in Development Mode

```bash
npm run start:dev
```

This will:
- Start the application with hot-reload
- Watch for file changes
- Run on port 3000 (or PORT from .env)

### Access Points

- **API**: http://localhost:3000/api/v1
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

### Building for Production

```bash
npm run build
npm run start:prod
```

## Project Structure

```
src/
├── common/              # Shared utilities, decorators, guards
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   ├── dto/
│   └── interfaces/
├── config/              # Configuration files
│   ├── configuration.ts
│   └── validation.ts
├── modules/             # Feature modules
│   ├── auth/           # Authentication (TODO)
│   ├── users/          # User management (TODO)
│   ├── boxes/          # Box/project management (TODO)
│   ├── files/          # File operations (TODO)
│   ├── storage/        # ✅ Storage abstraction layer
│   │   ├── interfaces/
│   │   ├── providers/
│   │   │   ├── openstack-swift.provider.ts
│   │   │   ├── aws-s3.provider.ts
│   │   │   └── google-cloud-storage.provider.ts
│   │   ├── storage.module.ts
│   │   ├── storage.service.ts
│   │   └── storage.factory.ts
│   └── realtime/       # WebSocket/real-time (TODO)
├── app.module.ts        # Root module
└── main.ts              # Application entry point
```

## Storage Providers

The modernized Velox supports multiple storage backends:

### OpenStack Swift (Legacy)

```env
STORAGE_PROVIDER=openstack
OPENSTACK_AUTH_URL=https://your-keystone-host.com/v2.0
OPENSTACK_TENANT_ID=your-tenant-id
OPENSTACK_USERNAME=admin
OPENSTACK_PASSWORD=password
```

**Status**: Interface defined, implementation pending migration from legacy code.

### AWS S3

```env
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=velox-files
```

**Status**: ✅ Fully implemented

### Google Cloud Storage

```env
STORAGE_PROVIDER=gcs
GCP_PROJECT_ID=your-project-id
GCP_KEY_FILE=/path/to/service-account-key.json
GCS_BUCKET=velox-files
```

**Status**: ✅ Fully implemented

## Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## Available Scripts

- `npm run build` - Build the project
- `npm run start` - Start the application
- `npm run start:dev` - Start with hot-reload
- `npm run start:debug` - Start with debugger
- `npm run start:prod` - Start production build
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:cov` - Run tests with coverage

## Migration Status

### ✅ Completed (Phase 1)

- [x] TypeScript configuration
- [x] NestJS project structure
- [x] Environment configuration system
- [x] Storage abstraction layer (interfaces)
- [x] AWS S3 provider implementation
- [x] Google Cloud Storage provider implementation
- [x] Configuration validation

### 🚧 In Progress

- [ ] OpenStack Swift provider (migration from legacy code)
- [ ] Authentication module
- [ ] User management module
- [ ] File operations module
- [ ] Box management module

### 📋 Pending

- [ ] Real-time WebSocket integration
- [ ] Frontend modernization
- [ ] Database migrations
- [ ] Testing suite
- [ ] CI/CD pipeline
- [ ] Documentation

## Next Steps

1. **Migrate OpenStack Swift Provider**
   - Port logic from `app/services/openstack/` to new provider
   - Test against existing Swift deployments

2. **Implement Authentication Module**
   - JWT-based authentication
   - Replace Keystone user management
   - Password hashing with bcrypt

3. **Create User Module**
   - Migrate User model from Mongoose 3.x to 8.x
   - Implement CRUD operations
   - Add validation

4. **Implement File Module**
   - File upload/download
   - Integration with storage providers
   - Thumbnail generation
   - Versioning

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check MongoDB is running
mongosh

# Check connection string in .env
MONGODB_URI=mongodb://localhost:27017/velox
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Check Redis config in .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Storage Provider Issues

Check that the correct provider is configured and credentials are valid:

```bash
# Test AWS credentials
aws s3 ls

# Test GCS credentials
gcloud auth list
```

## Documentation

- [Modernization Plan](MODERNIZATION_PLAN.md) - Full modernization roadmap
- [Architecture Documentation](CLAUDE.md) - Current codebase architecture
- [API Documentation](http://localhost:3000/api/docs) - Swagger UI (when running)

## Contributing

See [MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md) for the full modernization roadmap and contribution guidelines.

## Support

For questions or issues related to the modernization effort, please refer to the documentation or create an issue in the repository.
