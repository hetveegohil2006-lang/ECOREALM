# Base node image
FROM node:22-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Expose server port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start command
CMD [ "node", "app.js" ]
