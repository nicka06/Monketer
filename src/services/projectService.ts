
import { supabase } from '@/integrations/supabase/client';
import { Project, EmailTemplate, PendingChange, ChatMessage, EmailElement } from '@/types/editor';

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
    // Try to get email from auth.user metadata first
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!authError && user) {
      // Use email as username if available
      return user.email || 'user';
    }
    
    // Since user_info.id is a bigint and userId is a UUID string, 
    // we need a different approach to query the user_info table
    // Try to find the user by a text field that might store the UUID
    const { data: userInfo, error } = await supabase
      .from('user_info')
      .select('username')
      .eq('username', userId) // Try matching on username field instead
      .maybeSingle();
    
    if (error || !userInfo) {
      console.error('Error fetching username:', error);
      return 'user'; // Fallback username
    }
    
    return userInfo.username || 'user';
  } catch (error) {
    console.error('Error in getUsernameFromId:', error);
    return 'user'; // Fallback username
  }
}

// Helper function to get project by name and username
export async function getProjectByNameAndUsername(projectName: string, username: string) {
  try {
    // FIXING: Avoid using auth.admin.listUsers which requires admin privileges
    
    // Try to find the user by email (username) directly from authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      throw new Error('Authentication error');
    }
    
    // If current user's email matches the username, use the current user's ID
    if (user && user.email === username) {
      // Find the project by name and user ID
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', projectName)
        .limit(1);
        
      if (projectError) throw projectError;
      
      if (!projects || projects.length === 0) {
        throw new Error('Project not found');
      }
      
      return projects[0];
    }
    
    // Fallback: Try to find the user in user_info by username
    const { data: userInfo, error: userError } = await supabase
      .from('user_info')
      .select('id')
      .eq('username', username)
      .single();
      
    if (userError || !userInfo) {
      throw new Error('User not found');
    }
    
    // Find the project by name and user ID
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userInfo.id.toString())
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
  // This is an enhanced version with better HTML generation
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${template.name}</title></head><body style="${styleObjectToString(template.styles)}">`;
  
  // Process each section
  template.sections.forEach(section => {
    // Skip sections marked for deletion
    if (section.pending && section.pendingType === 'delete') {
      return;
    }
    
    html += `<div style="${styleObjectToString(section.styles)}">`;
    
    // Process each element in the section
    section.elements.forEach(element => {
      // Skip elements marked for deletion
      if (element.pending && element.pendingType === 'delete') {
        return;
      }
      
      html += renderElementToHtml(element);
    });
    
    html += `</div>`;
  });
  
  html += `</body></html>`;
  return html;
}

// Helper function to render a single element to HTML
function renderElementToHtml(element: EmailElement): string {
  const elementStyle = styleObjectToString(element.styles);
  
  switch (element.type) {
    case 'header':
      return `<h2 style="${elementStyle}">${element.content}</h2>`;
      
    case 'text':
      return `<p style="${elementStyle}">${element.content}</p>`;
      
    case 'button':
      // Extract href from content if it contains a URL
      let buttonContent = element.content;
      let buttonHref = '#';
      
      // Look for URLs in the content or styles
      if (element.styles.href) {
        buttonHref = element.styles.href;
      } else if (element.content.includes('http')) {
        // Simple URL extraction (should be enhanced for production)
        const urlMatch = element.content.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          buttonHref = urlMatch[0];
          buttonContent = element.content.replace(urlMatch[0], '').trim();
        }
      }
      
      return `<a href="${buttonHref}" style="display:inline-block; text-decoration:none; ${elementStyle}">${buttonContent}</a>`;
      
    case 'image':
      return `<img src="${element.content}" alt="Email image" style="${elementStyle}" />`;
      
    case 'divider':
      return `<hr style="${elementStyle}" />`;
      
    default:
      return `<div style="${elementStyle}">${element.content}</div>`;
  }
}

// Helper function to convert style object to inline CSS string
function styleObjectToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .filter(([key]) => key !== 'href') // Filter out special properties like href
    .map(([key, value]) => {
      // Convert camelCase to kebab-case for CSS properties
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${cssKey}: ${value}`;
    })
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
export async function saveChatMessage(projectId: string, content: string, role: 'user' | 'assistant' = 'user') {
  try {
    // FIXING: Remove the 'role' field which doesn't exist in the chat_messages table schema
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        project_id: projectId,
        content
        // Remove role field as it's not in the schema
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

// Export the email as HTML
export async function exportEmailAsHtml(template: EmailTemplate): Promise<string> {
  return convertTemplateToHtml(template);
}
