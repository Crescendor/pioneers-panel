# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies like Vite)
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Create data directory for persistent volumes
RUN mkdir -p /data && chown node:node /data

# Copy production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy server files
COPY server/ ./server/

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/pioneers.db

# Start server
CMD ["npm", "start"]
