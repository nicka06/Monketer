// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// Note: Deno/Supabase Edge Functions use npm: specifier for node modules
import nodemailer from 'npm:nodemailer';

// --- IMPORTANT SECURITY NOTE ---
// Store GMAIL_USER and GMAIL_APP_PASSWORD as Supabase Edge Function secrets!
// Access them via Deno.env.get('SECRET_NAME')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: Restrict this in production!
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('send-preview-email function starting...');

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Received request:', req.method);
    const { recipientEmail, emailHtml } = await req.json();
    console.log('Parsed request body:', { recipientEmail: recipientEmail ? 'present' : 'missing', emailHtml: emailHtml ? 'present' : 'missing' });

    if (!recipientEmail || !emailHtml) {
      console.error('Missing recipient email or HTML content.');
      throw new Error("Missing recipient email or HTML content.");
    }

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailAppPassword) {
      console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables.');
      throw new Error("Email sending configuration is missing on the server.");
    }

    console.log('Attempting to create transporter...');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
      // Optional: Add debug logging for transporter
      // logger: true,
      // debug: true, 
    });
    console.log('Transporter created successfully.');

    const mailOptions = {
      from: `"Emailore Preview" <${gmailUser}>`, // Sender address
      to: recipientEmail, // List of receivers
      subject: 'Your Email Preview from Emailore', // Subject line
      html: emailHtml, // html body
    };
    console.log('Mail options prepared:', { from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject });

    // Send mail with defined transport object
    console.log('Attempting to send email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully: %s', info.messageId);

    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in send-preview-email function:", error);
    // Ensure error message is stringified properly
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('send-preview-email function initialized.');

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-preview-email' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
