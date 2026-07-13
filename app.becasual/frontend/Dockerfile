# Stage 1: Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage using Nginx
FROM nginx:stable-alpine

# Set default port to 8080 (Cloud Run overrides this environment variable)
ENV PORT=8080

# Copy built assets from the build stage to Nginx's HTML serving folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Nginx template for dynamic port injection
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Expose port 8080
EXPOSE 8080

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
