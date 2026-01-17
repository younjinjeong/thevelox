# Multi-stage build for Velox NestJS application
# Stage 1: Build dependencies and compile TypeScript
FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# Stage 2: Production runtime image
FROM node:20-alpine

# Install dumb-init and build tools for bcrypt
RUN apk add --no-cache dumb-init python3 make g++

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Install production dependencies and rebuild native modules
RUN npm ci --only=production && npm rebuild bcrypt --build-from-source

# Copy compiled application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Create directories for file uploads, temp storage, and logs
RUN mkdir -p /app/uploads /app/temp /app/logs && \
    chown -R nodejs:nodejs /app/uploads /app/temp /app/logs

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
