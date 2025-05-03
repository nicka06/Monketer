   # Use Node.js 18
   FROM node:18-alpine
   
   # Set working directory
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   
   # Install dependencies
   RUN npm ci
   
   # Copy all files
   COPY . .
   
   # Build the app
   RUN npm run build
   
   # Install serve to run the app
   RUN npm install -g serve
   
   # Expose port 8080
   EXPOSE 8080
   
   # Start the app
   CMD ["serve", "-s", "dist", "-l", "8080"]