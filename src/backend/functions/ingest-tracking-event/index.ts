// @ts-ignore
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
// Remove the factory import
// import { corsHeadersFactory } from '../_shared/lib/constants.ts';
// Import the original simple corsHeaders
import { corsHeaders } from '../_shared/cors.ts';

console.log('Ingest Tracking Event function booting up...');

interface TrackedEventPayload {
  email_setup_id: string;
  event_name: string;
  event_data?: Record<string, any>;
  page_url?: string;
  client_timestamp?: string;
}

// @ts-ignore
serve(async (req: Request) => {
  // Remove dynamic CORS header generation
  // const requestOrigin = req.headers.get('Origin');
  // const dynamicCorsHeaders = corsHeadersFactory(requestOrigin);

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders }); // Use simple corsHeaders
  }

  try {
    // @ts-ignore
    const payload: TrackedEventPayload = await req.json();
    console.log('Received payload:', payload);

    // Validate essential fields
    if (!payload.email_setup_id || !payload.event_name) {
        // @ts-ignore
      return new Response(JSON.stringify({ error: 'email_setup_id and event_name are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Use simple corsHeaders
        status: 400,
      });
    }

    // Prepare data for Supabase
    const eventToInsert = {
      email_setup_id: payload.email_setup_id,
      event_name: payload.event_name,
      event_data: payload.event_data || null,
      page_url: payload.page_url || null,
      client_timestamp: payload.client_timestamp ? new Date(payload.client_timestamp).toISOString() : null,
      // user_agent and ip_address could be extracted from req headers if needed
    };

    console.log('Ingesting event:', JSON.stringify(eventToInsert)); // Log the event object

    const { data, error } = await supabaseAdmin
      .from('tracked_events')
      .insert(eventToInsert)
      .select(); // Optionally select to confirm insert or get generated ID

    if (error) {
      console.error('Error inserting event into Supabase:', error);
      // @ts-ignore
      return new Response(JSON.stringify({ error: 'Failed to store tracking event', details: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Use simple corsHeaders
        status: 500,
      });
    }

    console.log('Event stored successfully:', data);
    // Return a 204 No Content for successful beacon/POST requests if no body is needed
    // Or 200/201 if you want to return the created object or a success message
    // @ts-ignore
    return new Response(null, {
      headers: corsHeaders, // Use simple corsHeaders
      status: 204, 
    });

  } catch (err) {
    console.error('Error processing request:', err);
    // @ts-ignore
    return new Response(JSON.stringify({ error: 'Bad request', details: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Use simple corsHeaders
      status: 400,
    });
  }
}); 