export interface BlogPost {
  id: string;
  created_at: string;
  title: string;
  slug: string;
  content: string; // For Markdown/MDX
  author_id: string;
  featured_image_url?: string | null;
  excerpt?: string | null;
  published_at?: string | null;
  is_published?: boolean;
} 