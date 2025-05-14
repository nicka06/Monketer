import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { BlogPost } from '@/shared/types/blog';

const BlogIndexPage: React.FC = () => {
  const [allBlogPosts, setAllBlogPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('blog_posts')
          .select('*')
          .order('published_at', { ascending: false });

        console.log('BlogIndexPage - Fetched posts data:', data);
        console.log('BlogIndexPage - Fetched posts supabaseError:', supabaseError);

        if (supabaseError) {
          throw supabaseError;
        }
        setAllBlogPosts(data || []);
      } catch (err: any) {
        console.error("BlogIndexPage - Error during fetchPosts:", err);
        setError(err.message || 'Failed to fetch blog posts. Please try again later.');
      }
      setIsLoading(false);
    };

    fetchPosts();
  }, []);

  const filteredPosts = useMemo(() => {
    return allBlogPosts
      .filter(post => {
        if (!searchTerm) return true;
        const lowerSearchTerm = searchTerm.toLowerCase();
        const authorSearch = post.author_id ? post.author_id.toLowerCase().includes(lowerSearchTerm) : false;
        const excerptSearch = post.excerpt ? post.excerpt.toLowerCase().includes(lowerSearchTerm) : false;
        
        return (
          post.title.toLowerCase().includes(lowerSearchTerm) ||
          excerptSearch ||
          authorSearch
        );
      });
  }, [searchTerm, allBlogPosts]);

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen flex flex-col">
      <div className="container mx-auto pt-16 pb-12 px-4 md:px-8 flex-grow">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">Welcome to Our Blog</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover insights, tutorials, and thoughts on email marketing, AI, design, and more.
          </p>
        </header>

        {/* Search and Filter Section - Integrated UI */}
        <div className="mb-12 flex flex-col items-center gap-4">
          {/* Search Input - Centered and Wider */}
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 pointer-events-none" />
            <Input
              id="search"
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10 py-3 w-full text-base bg-white border-gray-300 focus:border-monketer-purple focus:ring-monketer-purple rounded-md shadow-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 h-8 w-8 p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200"
              >
                <XCircle className="h-5 w-5" />
                <span className="sr-only">Clear search</span>
              </Button>
            )}
          </div>
        </div>

        {/* Blog Post Grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="mx-auto h-16 w-16 text-monketer-purple animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">Loading Posts...</h3>
            <p className="text-gray-500 mt-2">Please wait while we fetch the latest articles.</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-red-50 border border-red-200 rounded-lg p-8">
            <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-red-700">Error Fetching Posts</h3>
            <p className="text-red-600 mt-2">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-6 bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {filteredPosts.map((post) => (
              <Link to={`/blog/${post.slug}`} key={post.slug} className="block group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col">
                <article className="flex flex-col h-full">
                  <div className="relative">
                    <img 
                      src={post.featured_image_url || 'https://via.placeholder.com/800x400.png?text=Blog+Image'}
                      alt={`Thumbnail for ${post.title}`}
                      className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h2 className="text-xl font-semibold text-gray-800 mb-2 group-hover:text-monketer-purple transition-colors duration-300 leading-tight">
                      {post.title}
                    </h2>
                     <p className="text-xs text-gray-500 mb-3">
                       {post.author_id && `By ${post.author_id}`}{post.author_id && post.published_at && ' • '}{post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Date N/A'}
                     </p>
                    <p className="text-gray-600 text-sm mb-4 flex-grow">
                      {post.excerpt || 'No excerpt available.'}
                    </p>
                    <div className="mt-auto">
                       <span className="text-sm text-monketer-purple font-semibold group-hover:underline">
                         Read More &rarr;
                       </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
             <Search className="mx-auto h-16 w-16 text-gray-400 mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-gray-700">No Posts Found</h3>
            <p className="text-gray-500 mt-2">Your search for "{searchTerm}" didn't return any results. Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default BlogIndexPage; 