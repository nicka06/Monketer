/**
 * Email Preview Sender Edge Function
 * 
 * This function handles sending preview emails to users for their email templates.
 * It uses Gmail SMTP for reliable email delivery and includes proper error handling
 * and logging for debugging purposes.
 * 
 * Key Features:
 * - Secure email sending via Gmail SMTP
 * - CORS support for cross-origin requests
 * - Comprehensive error handling and logging
 * - Environment variable validation
 * - Type-safe request/response handling
 */

// --- External Dependencies ---
// Note: These imports are for Deno runtime and will show TypeScript errors in IDE
// but are required for the edge function to work in production
// @ts-ignore - Deno-specific import, not available in TypeScript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore - Deno-specific import, not available in TypeScript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore - ESM import not available in TypeScript
import nodemailer from 'npm:nodemailer';
import { corsHeadersFactory } from '../_shared/lib/constants.ts';

// --- IMPORTANT SECURITY NOTE ---
// Store GMAIL_USER and GMAIL_APP_PASSWORD as Supabase Edge Function secrets!
// Access them via Deno.env.get('SECRET_NAME')

console.log('send-preview-email function starting...');

/**
 * Main server handler for sending preview emails
 * 
 * @param req - The incoming HTTP request containing recipient email and HTML content
 * @returns HTTP response with success status or error message
 */
serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response('ok', { headers: corsHeadersFactory(req.headers.get('origin')) });
  }

  try {
    console.log('Received request:', req.method);
    const { recipientEmail, emailHtml } = await req.json();
    console.log('Parsed request body:', { recipientEmail: recipientEmail ? 'present' : 'missing', emailHtml: emailHtml ? 'present' : 'missing' });

    // Validate required fields
    if (!recipientEmail || !emailHtml) {
      console.error('Missing recipient email or HTML content.');
      throw new Error("Missing recipient email or HTML content.");
    }

    // Retrieve email configuration from environment variables
    // @ts-ignore - Deno.env is only available in Deno runtime
    const gmailUser = Deno.env.get('GMAIL_USER');
    // @ts-ignore - Deno.env is only available in Deno runtime
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    // Add explicit logging for debugging
    console.log(`Retrieved GMAIL_USER: ${gmailUser ? '***found***' : '***NOT FOUND***'}`); 
    console.log(`Retrieved GMAIL_APP_PASSWORD: ${gmailAppPassword ? '***found***' : '***NOT FOUND***'}`);

    // Validate email configuration
    if (!gmailUser || !gmailAppPassword) {
      console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD environment variables.');
      throw new Error("Email sending configuration is missing on the server.");
    }

    // Create SMTP transporter for Gmail
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

    // Prepare email options
    const mailOptions = {
      from: `\"Emailore Preview\" <test@monketer.com>`, // Sender address - Use custom domain
      to: recipientEmail, // List of receivers
      subject: 'Your Email Preview from Emailore', // Subject line
      html: emailHtml, // html body
    };
    console.log('Mail options prepared:', { from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject });

    // Send email using configured transporter
    console.log('Attempting to send email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully: %s', info.messageId);

    // Return success response
    return new Response(JSON.stringify({ success: true, messageId: info.messageId }), {
      headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Global error handler
    console.error("Error in send-preview-email function:", error);
    // Ensure error message is stringified properly
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeadersFactory(req.headers.get('origin')), 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

console.log('send-preview-email function initialized.');

/**
 * Local Development Instructions
 * 
 * To invoke locally:
 * 1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
 * 2. Make an HTTP request:
 * 
 * curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-preview-email' \
 *   --header 'Authorization: Bearer ***REMOVED***' \
 *   --header 'Content-Type: application/json' \
 *   --data '{"name":"Functions"}'
 */
