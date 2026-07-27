FROM node:current-alpine3.24

WORKDIR /app

# Create uploads directory and set permissions for node user
RUN mkdir -p uploads && chown -R node:node uploads

# Copy dependencies manifest first
COPY --chown=node:node package*.json ./
RUN npm install

# Copy application files
COPY --chown=node:node . .

# Build application
RUN npm run build

# Switch to non-root node user for container runtime execution
USER node

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
