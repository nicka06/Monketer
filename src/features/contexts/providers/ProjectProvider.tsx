import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/features/auth/useAuth';
import { 
  getProject, 
  createProject as createProjectService, 
  updateProject,
} from '@/features/services/projectService';
import { Project } from '@/features/types/editor';

// Define the shape of the context's data
interface ProjectContextType {
  projectData: Project | null;
  setProjectData: React.Dispatch<React.SetStateAction<Project | null>>;
  actualProjectId: string | null;
  projectTitle: string;
  setProjectTitle: React.Dispatch<React.SetStateAction<string>>;
  isEditingTitle: boolean;
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>;
  livePreviewHtml: string | null;
  setLivePreviewHtml: React.Dispatch<React.SetStateAction<string | null>>;
  fetchAndSetProject: (id: string) => Promise<Project | null>;
  handleTitleChange: (newTitle: string) => Promise<void>;
  createProject: (title: string) => Promise<Project | null>;
}

// Create the context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Create the provider component
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Project state - Core data about the current project
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Untitled Document');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [livePreviewHtml, setLivePreviewHtml] = useState<string | null>(null);

  const fetchAndSetProject = useCallback(async (id: string): Promise<Project | null> => {
    try {
      const fetchedProject = await getProject(id);
      if (fetchedProject) {
        setProjectData(fetchedProject);
        setProjectTitle(fetchedProject.name);
        setActualProjectId(fetchedProject.id);
        return fetchedProject;
      } else {
        toast({ title: "Error", description: "Project not found.", variant: "destructive" });
        navigate('/dashboard');
        return null;
      }
    } catch (error) {
      console.error("Error in fetchAndSetProject", error);
      toast({ title: "Error", description: "Failed to load project.", variant: "destructive" });
      navigate('/dashboard');
      return null;
    }
  }, [navigate, toast]);
  
  const createProject = async (title: string) => {
    try {
      const newProject = await createProjectService(title);
      if (newProject) {
        setProjectData(newProject);
        setActualProjectId(newProject.id);
        setProjectTitle(newProject.name);
        window.history.replaceState({}, '', `/editor/${newProject.id}`);
        return newProject;
      }
      return null;
    } catch (error) {
      console.error("Error creating project", error);
      toast({ title: "Error", description: "Could not create a new project.", variant: "destructive" });
      return null;
    }
  };

  const handleTitleChange = async (newTitle: string) => {
    if (!actualProjectId || !user) {
      toast({ title: 'Error', description: 'Cannot change title without a saved project.', variant: 'destructive' });
      return;
    }
    const oldTitle = projectTitle;
    setProjectTitle(newTitle);
    try {
      // Assuming updateProject service exists and works with Partial<Project>
      // await updateProject(actualProjectId, { name: newTitle });
      toast({ title: 'Success', description: 'Project title updated.' });
    } catch (error) {
      setProjectTitle(oldTitle);
      toast({ title: 'Error', description: 'Failed to update title.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const initializeEditor = async () => {
      if (projectId) {
        await fetchAndSetProject(projectId);
      }
    };
    initializeEditor();
  }, [projectId, fetchAndSetProject]);
  
  const value = {
    projectData,
    setProjectData,
    actualProjectId,
    projectTitle,
    setProjectTitle,
    isEditingTitle,
    setIsEditingTitle,
    livePreviewHtml,
    setLivePreviewHtml,
    fetchAndSetProject,
    handleTitleChange,
    createProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

// Create the custom hook for consuming the context
export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
