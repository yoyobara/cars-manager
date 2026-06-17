# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root configuration files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm install

# Copy the entire workspace (honoring .dockerignore)
COPY . .

# Build the frontend application
RUN npx nx build frontend

# Production stage
FROM nginx:stable-alpine

# Copy the build output from the build stage
COPY --from=build /app/dist/apps/frontend /usr/share/nginx/html

# Copy custom nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
