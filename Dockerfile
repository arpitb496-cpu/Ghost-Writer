# Base Node.js image
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for Vite)
RUN npm install

# Copy project files
COPY . .

# Build the React frontend
RUN npm run build

# Use a leaner stage for production
FROM node:20-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy the built frontend from previous stage
COPY --from=builder /app/dist ./dist

# Copy the server script and necessary config
COPY server.js ./

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
