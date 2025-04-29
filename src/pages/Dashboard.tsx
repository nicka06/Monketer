
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { Mail, Plus, Trash2, MoreVertical } from 'lucide-react';
import { getUserProjects, createProject } from '@/services/projectService';
import { Project } from '@/types/editor';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadProjects();
  }, []);

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

  const handleCreateProject = async () => {
    try {
      const newProject = await createProject('Untitled Project');
      toast({
        title: 'Success',
        description: 'New project created',
      });
      navigate(`/editor/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Email Projects</h1>
        <Button onClick={handleCreateProject} className="bg-emailore-purple hover:bg-emailore-purple-dark">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emailore-purple"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new email project.</p>
          <div className="mt-6">
            <Button onClick={handleCreateProject} className="bg-emailore-purple hover:bg-emailore-purple-dark">
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{project.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-gray-500">
                  Last edited {formatDate(project.lastEditedAt.toString())}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-emailore-purple hover:bg-emailore-purple-dark">
                  <Link to={`/editor/${project.id}`}>Open Project</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
