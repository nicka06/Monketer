# ---- Build Stage ----
FROM node:18-alpine AS build

# Install tools (including bash) and then bun
RUN apk add --no-cache curl unzip bash && curl -fsSL https://bun.sh/install | bash
   
   # Set working directory
   WORKDIR /app
   
# Copy package.json and bun.lockb
COPY package.json bun.lockb ./
   
# Install dependencies using bun
ENV BUN_INSTALL_CACHE_DIR=/tmp/.bun_cache
RUN /root/.bun/bin/bun install --frozen-lockfile --cache-dir $BUN_INSTALL_CACHE_DIR
   
# Copy the rest of the application code
   COPY . .
   
# Define build arguments for Vite
ARG _VITE_SUPABASE_URL
ARG _VITE_SUPABASE_ANON_KEY
ARG _VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG _VITE_PUBLIC_STRIPE_PRO_PRICE_ID
ARG _VITE_PUBLIC_STRIPE_PREMIUM_PRICE_ID

# Set them as environment variables for the build process
ENV VITE_SUPABASE_URL=${_VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${_VITE_SUPABASE_ANON_KEY}
ENV VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY=${_VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY}
ENV VITE_PUBLIC_STRIPE_PRO_PRICE_ID=${_VITE_PUBLIC_STRIPE_PRO_PRICE_ID}
ENV VITE_PUBLIC_STRIPE_PREMIUM_PRICE_ID=${_VITE_PUBLIC_STRIPE_PREMIUM_PRICE_ID}

# Build the application
RUN /root/.bun/bin/bun run build
   
# ---- Production Stage ----
FROM nginx:alpine

# Copy the built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy a custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]