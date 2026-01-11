# Multi-stage Dockerfile for AUREUS Platform
# Optimized for production deployment with security hardening

# Stage 1: Base dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Dependencies installer
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production --ignore-scripts

# Stage 3: Development dependencies
FROM base AS deps-dev
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Stage 4: Builder
FROM base AS builder
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

# Build application with production optimizations
ENV NODE_ENV=production
RUN npm run build

# Stage 5: Development image
FROM base AS development
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 6: Production image
FROM nginx:alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aureus -u 1001

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config
COPY --chown=aureus:nodejs <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 5000;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com;" always;
    
    root /usr/share/nginx/html;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    gzip_min_length 1000;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Evidence directory with proper permissions
RUN mkdir -p /app/evidence && \
    chown -R aureus:nodejs /app/evidence && \
    chmod 750 /app/evidence

# Switch to non-root user
USER aureus

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

LABEL maintainer="AUREUS Platform Team" \
      version="0.1.0" \
      description="AUREUS Governed Agentic Data Platform - Frontend" \
      com.aureus.tier="production" \
      com.aureus.component="frontend"

CMD ["nginx", "-g", "daemon off;"]
