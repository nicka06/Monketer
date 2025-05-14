// @ts-ignore: Deno-specific import
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore: Deno-specific import
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeadersFactory } from '../_shared/lib/constants.ts'; // Assuming cors factory is here
// Note: Adjust import path for shared types if necessary
import { BlogPost } from '../../../shared/types/blog.ts'; 

console.log('Create Blog Post function booting up...');

// @ts-ignore: Deno-specific serve function
serve(async (req: Request) => {
  const corsHeaders = corsHeadersFactory(req.headers.get('origin') || '');
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabase: SupabaseClient;

  try {
    // Use non-VITE prefixed names for backend environment variables
    // These should be set in your Edge Function's settings in the Supabase dashboard
    // and in your local .env file (e.g., in supabase/.env) for local development.
    // @ts-ignore: Deno-specific environment variable access
    const supabaseUrl = Deno.env.get('SUPABASE_URL'); 
    // @ts-ignore: Deno-specific environment variable access
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); 
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.");
      throw new Error("Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set.");
    }

    // Initialize client with Service Role Key to bypass RLS for this trusted function
    // @ts-ignore: createClient is from a Deno-specific import
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Parse and validate request body
    let postData: Partial<BlogPost>; // Assuming BlogPost type aligns with expected fields
    try {
      postData = await req.json();
    } catch (jsonError) {
      console.error("Error parsing JSON body:", jsonError);
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic validation - ensure required fields are present
    // Ensure your BlogPost type or Partial<BlogPost> allows for author_id and featured_image_url
    if (!postData.title || !postData.slug || !postData.content || !postData.author_id) { // Added author_id check
       console.error("Validation Error: Missing required fields", { 
         title: postData.title, 
         slug: postData.slug, 
         content: !!postData.content,
         author_id: postData.author_id // Added for logging
       });
      return new Response(JSON.stringify({ error: 'Missing required fields: title, slug, content, author_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for insertion, aligning with your table schema
    // and the payload sent by the Python script.
    const insertData = {
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      author_id: postData.author_id, // Expecting author_id from Python script
      featured_image_url: postData.featured_image_url, // Expecting featured_image_url
      excerpt: postData.excerpt,
      published_at: postData.published_at, // Allow setting publish date, or defaults to null
      // Default is_published to false if not explicitly provided in the payload.
      // Ensure your BlogPost partial type allows for is_published or handle undefined.
      is_published: typeof postData.is_published === 'boolean' ? postData.is_published : false,
    };

    console.log("Attempting to insert post:", insertData.slug);

    // 3. Insert data into Supabase
    const { data: newPost, error: insertError } = await supabase
      .from('blog_posts')
      .insert(insertData)
      .select() // Return the newly created row
      .single(); // Expecting a single row back

    if (insertError) {
      console.error("Supabase insert error:", insertError);
       // Check for unique constraint violation (e.g., duplicate slug)
      if (insertError.code === '23505') { // PostgreSQL unique violation code
         return new Response(JSON.stringify({ error: `Failed to create post: Slug '${insertData.slug}' already exists.` }), {
           status: 409, // Conflict
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
      }
      // For RLS errors (though service_role should bypass) or other issues:
      return new Response(JSON.stringify({ error: insertError.message, details: insertError.details }), {
        status: 500, // Or a more specific error code if identifiable
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("Successfully inserted post:", (newPost as BlogPost)?.slug);

    // 4. Return the newly created post
    return new Response(JSON.stringify(newPost), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    // Catch errors from missing env vars or other unexpected issues
    console.error("Error in create-blog-post function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 