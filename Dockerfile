# Base node image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose server port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start command
CMD [ "node", "app.js" ]
