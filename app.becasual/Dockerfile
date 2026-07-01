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

# Copy built assets from the build stage to Nginx's HTML serving folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Run Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
