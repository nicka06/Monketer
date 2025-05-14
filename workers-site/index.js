import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

/**
 * The DEBUG flag will do two things:
 * 1. return plaintext errors instead of HTML views for errors
 * 2. return error stacks directly to the client
 */
const DEBUG = false // Set to true for local development debugging

addEventListener('fetch', event => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})

async function handleEvent(event) {
  const url = new URL(event.request.url)
  let options = {}

  // Configure caching behavior if needed
  // if (DEBUG) {
  //   options.cacheControl = {
  //     bypassCache: true,
  //   };
  // }

  // For SPAs, map requests for non-file paths to index.html
  options.mapRequestToAsset = (req) => {
    const defaultUrl = new URL(req.url);
    const pathname = defaultUrl.pathname;

    // If the path doesn't have an extension (e.g., .js, .css, .png),
    // or it's the root path, serve index.html.
    if (!pathname.includes('.') || pathname === '/') {
      const newUrl = new URL(req.url);
      newUrl.pathname = '/index.html';
      return new Request(newUrl.toString(), req);
    }
    
    // Otherwise, serve the asset directly (e.g., /assets/main.js)
    return mapRequestToAsset(req);
  };

  try {
    const page = await getAssetFromKV(event, options)
    const response = new Response(page.body, page)

    // Set security headers
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'unsafe-url')
    // Consider a stricter Content-Security-Policy if applicable
    // response.headers.set('Content-Security-Policy', "default-src 'self'");

    return response
  } catch (e) {
    // If asset not found, and not in debug mode, try to serve 404.html
    if (!DEBUG) {
      try {
        const notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/404.html`, req),
        })
        return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 })
      } catch (e) {}
    }
    return new Response(e.message || e.toString(), { status: 500 })
  }
} 