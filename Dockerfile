# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Copy package files
COPY package*.json ./

# Install dependencies with clean cache
RUN npm install && \
    npm cache clean --force

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Start development server with host parameter
CMD ["npm", "run", "dev", "--", "--host"]