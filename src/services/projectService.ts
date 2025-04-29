import { supabase } from '@/integrations/supabase/client';
import { Project, EmailTemplate, PendingChange, ChatMessage } from '@/types/editor';

// Create a new project
export async function createProject(name: string, initialContent?: EmailTemplate) {
  try {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if project name already exists for this user
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('name')
      .eq('user_id', user.id)
      .ilike('name', `${name}%`);
    
    if (checkError) throw checkError;
    
    // Modify name if it already exists
    let uniqueName = name;
    if (existingProjects && existingProjects.length > 0) {
      // Find similar names and generate a name with an incremented number
      const similarNames = existingProjects.map(p => p.name);
      let counter = 1;
      
      while (similarNames.includes(uniqueName)) {
        uniqueName = `${name} (${counter})`;
        counter++;
      }
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: uniqueName,
        user_id: user.id,
        last_edited_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (projectError) throw projectError;
    
    // If initial content is provided, create first version and update HTML/semantic fields
    if (initialContent) {
      // Create email version
      const { error: versionError } = await supabase
        .from('email_versions')
        .insert({
          project_id: project.id,
          version_number: 1,
          content: initialContent as any, // Cast to any to resolve type issue
        });

      if (versionError) throw versionError;
      
      // Convert template to HTML
      const htmlOutput = convertTemplateToHtml(initialContent);
      
      // Update project with HTML and semantic data
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          current_html: htmlOutput,
          semantic_email: initialContent as any,
          last_edited_at: new Date().toISOString()
        })
        .eq('id', project.id);
        
      if (updateError) throw updateError;
    }

    // Convert from database schema to our app schema
    return {
      id: project.id,
      name: project.name,
      lastEditedAt: new Date(project.last_edited_at),
      createdAt: new Date(project.created_at),
      isArchived: project.is_archived
    } as Project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

// Helper function to get username from user ID
export async function getUsernameFromId(userId: string): Promise<string> {
  try {
    // First try to get user from auth.users
    const { data: authUserData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (!authError && authUserData?.user) {
      // Use email as fallback username if available
      return authUserData.user.email || 'user';
    }
    
    // Otherwise fall back to querying the user_info table, but we need to handle the type difference
    // The user_info table expects a number ID, not a UUID string
    const { data: userInfo, error } = await supabase
      .from('user_info')
      .select('username')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching username:', error);
      return 'user'; // Fallback username
    }
    
    return userInfo?.username || 'user';
  } catch (error) {
    console.error('Error in getUsernameFromId:', error);
    return 'user'; // Fallback username
  }
}

// Helper function to get project by name and username
export async function getProjectByNameAndUsername(projectName: string, username: string) {
  try {
    // First try to find the user by username in user_info table
    const { data: userInfo, error: userError } = await supabase
      .from('user_info')
      .select('id')
      .eq('username', username)
      .single();
      
    if (userError) {
      // If not found in user_info, try to find the user in auth.users by email
      // This assumes username might be an email
      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers({
        filter: {
          email: username
        }
      });
      
      if (authError || !authUser || authUser.users.length === 0) {
        throw new Error('User not found');
      }
      
      // Use the UUID from auth.users
      const userId = authUser.users[0].id;
      
      // Find the project by name and user ID
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('name', projectName)
        .limit(1);
        
      if (projectError) throw projectError;
      
      if (!projects || projects.length === 0) {
        throw new Error('Project not found');
      }
      
      return projects[0];
    }
    
    // If user found in user_info, proceed with that id
    if (!userInfo) {
      throw new Error('User not found');
    }
    
    // Find the project by name and user ID from user_info
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userInfo.id.toString()) // Convert number to string if needed
      .eq('name', projectName)
      .limit(1);
      
    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      throw new Error('Project not found');
    }
    
    return projects[0];
  } catch (error) {
    console.error('Error fetching project by name and username:', error);
    throw error;
  }
}

// Helper function to convert email template to HTML
function convertTemplateToHtml(template: EmailTemplate): string {
  // This is a simplified version - in a real app, this would be more sophisticated
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${template.name}</title></head><body style="${styleObjectToString(template.styles)}">`;
  
  // Process each section
  template.sections.forEach(section => {
    html += `<div style="${styleObjectToString(section.styles)}">`;
    
    // Process each element in the section
    section.elements.forEach(element => {
      switch (element.type) {
        case 'header':
          html += `<h2 style="${styleObjectToString(element.styles)}">${element.content}</h2>`;
          break;
        case 'text':
          html += `<p style="${styleObjectToString(element.styles)}">${element.content}</p>`;
          break;
        case 'button':
          html += `<button style="${styleObjectToString(element.styles)}">${element.content}</button>`;
          break;
        case 'image':
          html += `<img src="${element.content}" alt="Email image" style="${styleObjectToString(element.styles)}" />`;
          break;
        case 'divider':
          html += `<hr style="${styleObjectToString(element.styles)}" />`;
          break;
      }
    });
    
    html += `</div>`;
  });
  
  html += `</body></html>`;
  return html;
}

// Helper function to convert style object to inline CSS string
function styleObjectToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

// Get all projects for current user
export async function getUserProjects() {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('last_edited_at', { ascending: false });

    if (error) throw error;
    
    // Convert from database schema to our app schema
    return (data || []).map(project => ({
      id: project.id,
      name: project.name,
      lastEditedAt: new Date(project.last_edited_at),
      createdAt: new Date(project.created_at),
      isArchived: project.is_archived
    })) as Project[];
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
}

// Get a specific project and its latest version
export async function getProject(projectId: string) {
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;

    // Get latest email version
    const { data: versions, error: versionError } = await supabase
      .from('email_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionError) throw versionError;

    const latestVersion = versions && versions.length > 0 ? versions[0] : null;

    // Get pending changes
    const { data: pendingChanges, error: pendingChangesError } = await supabase
      .from('pending_changes')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'pending');

    if (pendingChangesError) throw pendingChangesError;

    // Get chat history
    const { data: chatMessages, error: chatMessagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (chatMessagesError) throw chatMessagesError;

    // Convert to our app schema types
    const emailContent = latestVersion?.content as unknown as EmailTemplate;
    
    const formattedPendingChanges = (pendingChanges || []).map(change => ({
      id: change.id,
      elementId: change.element_id,
      changeType: change.change_type as 'add' | 'edit' | 'delete',
      oldContent: change.old_content,
      newContent: change.new_content,
      status: change.status as 'pending' | 'accepted' | 'rejected'
    })) as PendingChange[];
    
    const formattedChatMessages = (chatMessages || []).map(msg => ({
      id: msg.id,
      content: msg.content,
      timestamp: new Date(msg.created_at)
    })) as ChatMessage[];

    return {
      project,
      emailContent,
      pendingChanges: formattedPendingChanges,
      chatMessages: formattedChatMessages,
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
}

// Save chat message
export async function saveChatMessage(projectId: string, content: string) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        project_id: projectId,
        content,
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}

// Save pending change
export async function savePendingChange(
  projectId: string,
  elementId: string,
  changeType: 'add' | 'edit' | 'delete',
  oldContent?: any,
  newContent?: any
) {
  try {
    const { data, error } = await supabase
      .from('pending_changes')
      .insert({
        project_id: projectId,
        element_id: elementId,
        change_type: changeType,
        old_content: oldContent || null,
        new_content: newContent || null,
      })
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error saving pending change:', error);
    throw error;
  }
}

// Accept a pending change
export async function acceptPendingChange(changeId: string, projectId: string, updatedEmailContent: EmailTemplate) {
  try {
    // Mark the change as accepted
    const { error: changeError } = await supabase
      .from('pending_changes')
      .update({ status: 'accepted' })
      .eq('id', changeId);

    if (changeError) throw changeError;

    // Create a new version with the updated content
    const { data: versions, error: versionCheckError } = await supabase
      .from('email_versions')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (versionCheckError) throw versionCheckError;

    const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

    // Convert template to HTML
    const htmlOutput = convertTemplateToHtml(updatedEmailContent);

    const { error: saveVersionError } = await supabase
      .from('email_versions')
      .insert({
        project_id: projectId,
        version_number: nextVersionNumber,
        content: updatedEmailContent as any, // Cast to any to resolve type issue
      });

    if (saveVersionError) throw saveVersionError;

    // Update the project last_edited_at timestamp and HTML content
    const { error: projectUpdateError } = await supabase
      .from('projects')
      .update({ 
        last_edited_at: new Date().toISOString(),
        current_html: htmlOutput,
        semantic_email: updatedEmailContent as any
      })
      .eq('id', projectId);

    if (projectUpdateError) throw projectUpdateError;

    return true;
  } catch (error) {
    console.error('Error accepting pending change:', error);
    throw error;
  }
}

// Reject a pending change
export async function rejectPendingChange(changeId: string) {
  try {
    const { error } = await supabase
      .from('pending_changes')
      .update({ status: 'rejected' })
      .eq('id', changeId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rejecting pending change:', error);
    throw error;
  }
}
