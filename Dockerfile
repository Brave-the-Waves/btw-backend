# Use official Node.js image (lightweight)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the rest of the app code
COPY . .

# Expose the port Cloud Run expects
EXPOSE 8080

# Cloud Run injects PORT=8080, make sure server.js uses process.env.PORT
ENV PORT=8080

# Start the application
CMD ["npm", "start"]