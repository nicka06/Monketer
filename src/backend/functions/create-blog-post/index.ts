
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
    // @ts-ignore: Deno-specific environment variable access
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // @ts-ignore: Deno-specific environment variable access
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY'); // Use Anon key for inserts from trusted functions for now
    // For production/more secure scenarios, consider using the Service Role Key
    // const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey) { // || !supabaseServiceKey) {
      throw new Error("Supabase environment variables (URL, Anon Key) are not set.");
    }

    // @ts-ignore: createClient is from a Deno-specific import
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      // Pass auth header if necessary, though for creating public blog posts, anon might be fine
      // global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // 2. Parse and validate request body
    let postData: Partial<BlogPost>;
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
    if (!postData.title || !postData.slug || !postData.content) {
       console.error("Validation Error: Missing required fields", { title: postData.title, slug: postData.slug, content: !!postData.content });
      return new Response(JSON.stringify({ error: 'Missing required fields: title, slug, content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare data for insertion (remove potentially client-sent id/created_at)
    const insertData = {
      title: postData.title,
      slug: postData.slug,
      content: postData.content,
      author: postData.author,
      category: postData.category,
      image_url: postData.image_url,
      excerpt: postData.excerpt,
      published_at: postData.published_at // Allow setting publish date, or defaults to null
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
      throw insertError; // Re-throw other errors
    }

    console.log("Successfully inserted post:", (newPost as BlogPost)?.slug);

    // 4. Return the newly created post
    return new Response(JSON.stringify(newPost), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // Created
    });

  } catch (error) {
    console.error("Error in create-blog-post function:", error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 