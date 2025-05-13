import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BlogPost } from '@/shared/types/blog';
import Footer from '@/components/Footer';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BlogPostPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setError('Blog post slug is missing.');
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .single();

        if (supabaseError) {
          if (supabaseError.code === 'PGRST116') {
            throw new Error(`Blog post with slug '${slug}' not found.`);
          } else {
            throw supabaseError;
          }
        }
        setPost(data);
      } catch (err: any) {
        console.error(`Error fetching blog post with slug ${slug}:`, err);
        setError(err.message || 'Failed to fetch blog post.');
      }
      setIsLoading(false);
    };

    fetchPost();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center py-16">
            <Loader2 className="mx-auto h-16 w-16 text-monketer-purple animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Loading Post...</h3>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center py-16 bg-red-50 border border-red-200 rounded-lg p-8 max-w-md w-full">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-red-700">Error Loading Post</h3>
            <p className="text-red-600 mt-2 mb-6">{error}</p>
            <Link to="/blog" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-monketer-purple hover:bg-monketer-purple-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-monketer-purple">
              <ArrowLeft className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              Back to Blog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow flex items-center justify-center">
          <p>Blog post not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl flex-grow">
        <Link to="/blog" className="inline-flex items-center text-monketer-purple hover:underline mb-6 text-sm">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Blog Index
        </Link>

        <article className="prose prose-lg lg:prose-xl max-w-none">
          {post.image_url && (
            <img 
              src={post.image_url}
              alt={`Header image for ${post.title}`}
              className="w-full rounded-lg mb-8 shadow-md object-cover aspect-video"
            />
          )}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          <div className="text-gray-500 text-sm mb-8 border-b pb-4">
            {post.author && <span>By {post.author}</span>}
            {post.author && post.published_at && <span className="mx-2">&bull;</span>}
            {post.published_at && <span>Published on {new Date(post.published_at).toLocaleDateString()}</span>}
            {post.category && <span className="mx-2">&bull;</span>}
            {post.category && <span className="bg-gray-100 text-monketer-purple font-medium px-2 py-0.5 rounded-full">{post.category}</span>}
          </div>

          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({node, ...props}) => <a className="text-monketer-purple hover:text-monketer-purple-dark underline" {...props} />,
              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-monketer-purple pl-4 italic text-gray-700" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </article>
      </div>
      <Footer />
    </div>
  );
};

export default BlogPostPage; 