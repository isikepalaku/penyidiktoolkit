# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy project files
COPY . .

# Set environment variables untuk build
ENV NODE_ENV=production
ENV VITE_API_URL=https://api.reserse.id
ENV VITE_API_KEY=ag-wUJyLXzHxWyNMnzRXlPJjRNs4n18NZIbRrGpgxvYGSY
ENV VITE_PERKABA_API_URL=https://flow.reserse.id
ENV VITE_PERKABA_API_KEY=kzeL0g3LzjRzG9a0-jgbay441zTkAaGgC1mu0jVs330

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Install required packages
RUN apk add --no-cache curl

# Create nginx temp directories
RUN mkdir -p /tmp/nginx/client_temp \
    /tmp/nginx/proxy_temp \
    /tmp/nginx/fastcgi_temp \
    /tmp/nginx/uwsgi_temp \
    /tmp/nginx/scgi_temp \
    && chmod 700 /tmp/nginx/*

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create cache directory
RUN mkdir -p /var/cache/nginx && chmod 777 /var/cache/nginx

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 