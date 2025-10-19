# Dockerfile for production build
FROM node:22-alpine
WORKDIR /app

# Copy package descriptors and install all dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Set environment variable 
ENV NODE_ENV=production

# Expose the port
EXPOSE 26925

# Run the built application
CMD ["node", "dist/src/main.js"]
