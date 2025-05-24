/**
 * Dashboard Component
 * 
 * Main user dashboard for managing email projects. Displays a list of user projects
 * and provides functionality to create new projects or open existing ones.
 * 
 * Features:
 * - Project listing with names and last edited dates
 * - Creation of new email projects
 * - Navigation to the email editor
 * - Empty state handling
 * - Loading state with spinner
 * - Sign out functionality
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, FileText } from 'lucide-react';
import { getUserProjects, getUsernameFromId } from '@/features/services/projectService';
import { Project } from '@/features/types/editor';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  useEffect(() => {
    // Load projects and user data when component mounts
    loadProjects();
    
    // Only try to get username if user exists
    if (user?.id) {
      getUsernameFromId(user.id)
        .then(name => setUsername(name))
        .catch(err => {
          console.error("Error getting username:", err);
          // Use email as fallback if available
          if (user.email) {
            setUsername(user.email);
          }
        });
    }
  }, [user]);

  /**
   * Loads the user's projects from the backend service
   * Updates state with projects or shows error toast on failure
   */
  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getUserProjects();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Navigates to the editor for creating a new project
   * The actual project creation happens in the editor
   * Updated to check project limits before navigating.
   */
  const handleCreateProject = async () => {
    if (!user) {
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create a project.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    try {
      // Fetch user_info to check subscription and project count
      const { data: userInfo, error: userInfoError } = await supabase
        .from('user_info')
        .select('subscription_tier, subscription_status, project_count')
        .eq('auth_user_uuid', user.id)
        .single();

      if (userInfoError) {
        console.error('Error fetching user_info:', userInfoError);
        toast({
          title: 'Error',
          description: 'Could not verify your subscription details. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      if (!userInfo) {
        console.error('User info not found for user:', user.id);
        toast({
          title: 'Subscription Error',
          description: 'Subscription details not found. Please complete your subscription setup.',
          variant: 'default',
        });
        navigate('/subscription');
        return;
      }
      
      if (userInfo.subscription_status !== 'active') {
        toast({
          title: 'Subscription Inactive',
          description: 'Your subscription is not active. Please update your subscription to create new projects.',
          variant: 'default',
        });
        navigate('/subscription');
        return;
      }

      const projectLimits = {
        free: 1,
        pro: 25,
        premium: Infinity,
      };
      
      const currentTier = userInfo.subscription_tier as 'free' | 'pro' | 'premium';
      const limit = projectLimits[currentTier];

      if (userInfo.project_count >= limit) {
        toast({
          title: 'Project Limit Reached',
          description: `You've reached the project limit for your ${currentTier} plan. Please upgrade to create more projects.`,
          variant: 'destructive',
        });
        return;
      }

      navigate('/editor');
    } catch (error) {
      console.error('Error in handleCreateProject:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while trying to create a new project.',
        variant: 'destructive',
      });
    }
  };

  /**
   * Formats a date string into a user-friendly format
   * @param dateString - ISO date string to format
   * @returns Formatted date string
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto py-10 px-4">
      {/* Header with title and sign out button */}
      <div className="relative flex justify-center items-center mb-8">
        <h1 className="text-3xl font-bold text-center">My Email Templates</h1>
        <Button variant="outline" onClick={signOut} className="absolute top-0 right-0">
          Sign Out
        </Button>
      </div>

      {/* Loading spinner */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : projects.length === 0 ? (
        // Empty state
        <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new email project.</p>
          <div className="mt-6">
            <Button onClick={handleCreateProject}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        </div>
      ) : (
        // Projects table
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Last Edited</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>
                  {formatDate(project.lastEditedAt?.toString() || '')}
                </TableCell>
                <TableCell className="text-right">
                  {username ? (
                    <Button variant="outline" asChild>
                      <Link to={`/editor/${username}/${encodeURIComponent(project.name)}`}>Open</Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>Open</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      {/* Create new project button (shown only when projects exist and loading is complete) */}
      {!loading && projects.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button onClick={handleCreateProject}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
