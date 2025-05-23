import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// Removed express and related types as local API handlers are removed
// import express, { Router, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import type { ViteDevServer } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all .env variables into process.env using Vite's loadEnv
  // The third argument '' means all env variables are loaded, not just VITE_ prefixed ones.
  const env = loadEnv(mode, process.cwd(), '');
  for (const k in env) {
    process.env[k] = env[k];
  }

  return {
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
      // The following plugin for local API handlers is now removed
      // as API logic is handled by Supabase Edge Functions.
      /*
      {
        name: 'configure-server',
        configureServer(server: ViteDevServer) {
          // Ensure middleware is registered before server starts
          return () => {
            console.log('[VITE CONFIG] Setting up API routes and webhook handler...');
            
            const apiRouter = Router(); // Create an Express router

            // Middleware for parsing JSON bodies - apply to the apiRouter
            apiRouter.use(express.json());
            
            // Middleware for parsing raw body for Stripe webhooks - specific to this route on apiRouter
            apiRouter.post('/webhooks/stripe', express.raw({ type: 'application/json' }), (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
              // This middleware has done its job (raw body parsing), so we call next()
              // to proceed to the next handler for this same path (/webhooks/stripe)
              // which will be the actual webhook logic.
              next(); 
            });

            // Dynamically import and attach handlers to the apiRouter
            Promise.all([
              import('./server/api/subscribe/free.ts') as Promise<{ default: (req: ExpressRequest, res: ExpressResponse) => void }>,
              import('./server/api/create-checkout-session.ts') as Promise<{ default: (req: ExpressRequest, res: ExpressResponse) => void }>,
              import('./server/api/stripe-webhook/index.ts') as Promise<{ default: (req: ExpressRequest, res: ExpressResponse) => void }>
            ]).then(([freeHandlerModule, checkoutSessionModule, webhookHandlerModule]) => {
              console.log('[VITE CONFIG] API Handler modules loaded.');
              
              // Inspect the modules and their default exports
              console.log('[VITE CONFIG] Inspecting freeHandlerModule:', freeHandlerModule);
              console.log('[VITE CONFIG] Inspecting freeHandlerModule.default:', typeof freeHandlerModule.default, freeHandlerModule.default);
              
              console.log('[VITE CONFIG] Inspecting checkoutSessionModule:', checkoutSessionModule);
              console.log('[VITE CONFIG] Inspecting checkoutSessionModule.default:', typeof checkoutSessionModule.default, checkoutSessionModule.default);
              
              console.log('[VITE CONFIG] Inspecting webhookHandlerModule:', webhookHandlerModule);
              console.log('[VITE CONFIG] Inspecting webhookHandlerModule.default:', typeof webhookHandlerModule.default, webhookHandlerModule.default);

              // Proceed with route registration only if handlers are functions
              if (typeof freeHandlerModule.default === 'function') {
                apiRouter.post('/subscribe/free', freeHandlerModule.default);
                console.log('[VITE CONFIG] Registered POST /subscribe/free');
              } else {
                console.error('[VITE CONFIG] ERROR: freeHandlerModule.default is NOT a function!');
              }

              if (typeof checkoutSessionModule.default === 'function') {
                apiRouter.post('/create-checkout-session', checkoutSessionModule.default);
                console.log('[VITE CONFIG] Registered POST /create-checkout-session');
              } else {
                console.error('[VITE CONFIG] ERROR: checkoutSessionModule.default is NOT a function!');
              }

              if (typeof webhookHandlerModule.default === 'function') {
                apiRouter.post('/webhooks/stripe', webhookHandlerModule.default);
                console.log('[VITE CONFIG] Registered POST /webhooks/stripe (logic handler)');
              } else {
                console.error('[VITE CONFIG] ERROR: webhookHandlerModule.default is NOT a function!');
              }
              
              // Using 'as any' to bypass the strict Connect typing for the Express Router.
              // This is a common workaround when the underlying JavaScript is compatible.
              server.middlewares.use('/api', apiRouter as any); 
              console.log('[VITE CONFIG] API router mounted on /api. Inspecting registered routes on apiRouter:');
              for (const layer of apiRouter.stack) {
                if (layer.route && layer.route.path && layer.route.stack && layer.route.stack.length > 0) {
                  // Accessing methods through the internal stack of the route
                  const methods = layer.route.stack
                    .map(item => item.method)
                    .filter(method => method)
                    .map(method => method.toUpperCase());
                  if (methods.length > 0) {
                    console.log(`[VITE CONFIG] -> Route: ${methods.join(', ')} ${layer.route.path}`);
                  }
                }
              }

              console.log('[VITE CONFIG] API routes and webhook handler setup complete.');

            }).catch(error => {
              console.error('[VITE CONFIG] Failed to load API handlers (Promise.all catch): ', error);
            });
          };
        },
      },
      */
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
