# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Set host environment variable
ENV HOST=0.0.0.0

# Start development server
CMD ["npm", "run", "dev"]