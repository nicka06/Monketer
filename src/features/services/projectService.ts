import { supabase, handleSupabaseError, toJson } from '@/integrations/supabase/client';
import { Project, ChatMessage, PendingChange } from '@/features/types/editor';
import { EmailTemplate } from '@/shared/types';
import { HtmlGeneratorV2 } from './htmlGenerator';
import { cleanUuid } from '@/lib/uuid-utils';

// Helper function to get username from user ID, used internally
async function getUsernameFromId(userId: string): Promise<string> {
  try {
    const { data: userInfo, error } = await supabase
      .from('user_info')
      .select('username')
      .eq('auth_user_uuid', userId)
      .single();

    if (error || !userInfo) {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || 'Anonymous';
    }
    return userInfo.username || 'Anonymous';
  } catch (error) {
    console.error('Error fetching username:', error);
    return 'Anonymous';
  }
}

// Maps a raw database project object to the frontend Project type
function mapRawProjectToProject(raw: any): Project {
  return {
    id: raw.id,
    name: raw.name,
    createdAt: new Date(raw.created_at),
    lastEditedAt: new Date(raw.last_edited_at),
    current_html: raw.current_html,
    version: raw.version,
    has_first_draft: raw.has_first_draft,
    is_generating: raw.is_generating,
    email_content_structured: raw.email_content_structured as EmailTemplate | null,
    chat_messages: (raw.chat_messages as ChatMessage[]) || [],
    pending_changes: (raw.pending_changes as PendingChange[]) || [],
    username: 'Anonymous', // Default username, will be populated if user_id exists
  };
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`*, chat_messages(*), pending_changes(*)`)
      .eq('id', projectId)
      .single();

    if (error) {
      handleSupabaseError(error);
      return null;
    }
    if (!data) return null;

    const project = mapRawProjectToProject(data);

    if (data.user_id) {
        project.username = await getUsernameFromId(data.user_id);
    }

    return project;

  } catch (error) {
    console.error('Error in getProject service:', error);
    return null;
  }
}

export async function getUserProjects(): Promise<Project[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data: rawProjects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('last_edited_at', { ascending: false });

        if (error) {
            handleSupabaseError(error);
            return [];
        }

        const username = await getUsernameFromId(user.id);
        const projects = rawProjects.map(raw => mapRawProjectToProject(raw));
        projects.forEach(p => p.username = username);
        return projects;

    } catch (error) {
        console.error('Error fetching user projects:', error);
        return [];
    }
}

export async function updateProjectContent(
  projectId: string,
  emailContent: EmailTemplate,
): Promise<void> {
  try {
    const htmlGenerator = new HtmlGeneratorV2();
    const newHtml = await htmlGenerator.generate(emailContent);

    // Map from camelCase (frontend) to snake_case (DB) for the update
    const updateData = {
      last_edited_at: new Date().toISOString(),
      current_html: newHtml,
      email_content_structured: toJson(emailContent),
      has_first_draft: true,
      is_generating: false,
    };

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      handleSupabaseError(error);
    }
  } catch (error) {
    console.error('Error updating project content:', error);
    throw error;
  }
}

export async function createProject(title: string): Promise<Project | null> {
    // This function can be updated later to use the mapping function
    // For now, we return null as its implementation is not critical
    return null;
}

export async function saveChatMessage(message: ChatMessage): Promise<ChatMessage | null> {
    // This function can be updated later
    return null;
}