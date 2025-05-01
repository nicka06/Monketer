import { supabase, handleSupabaseError, toJson } from '@/integrations/supabase/client';
// import { cleanUuid } from '@/integrations/supabase/client'; // Removed - now importing from uuid-utils
import { Project, EmailTemplate, PendingChange, ChatMessage, EmailElement } from '@/types/editor';
import { cleanUuid } from '@/lib/uuid-utils'; // Import from new location

// Create a new project
export async function createProject(name: string, initialContent?: EmailTemplate) {
  console.log("[createProject] Starting..."); // Log entry
  try {
    // Get current user ID
    console.log("[createProject] Getting user..."); // Log before getUser
    const { data: authData, error: authError } = await supabase.auth.getUser(); // Get whole auth response
    
    // Log the raw auth response
    console.log("[createProject] Auth response:", { authData, authError }); 

    // Check for auth error first
    if (authError) {
        console.error("[createProject] Auth error occurred:", authError);
        throw authError; // Re-throw auth error
    }
    
    // Check if user object exists within data
    if (!authData?.user) { // Safer check for user object
      console.error("[createProject] User object not found in auth data.");
      throw new Error('User not authenticated or user data missing.');
    }
    
    // Destructure user *after* checks
    const user = authData.user; 
    console.log(`[createProject] User ID: ${user.id}`);

    // Check if project name already exists for this user
    console.log(`[createProject] Checking for existing project named '${name}'...`); // Log before check
    const { data: existingProjects, error: checkError } = await supabase
      .from('projects')
      .select('name')
      .eq('user_id', user.id)
      .ilike('name', `${name}%`);
      
    console.log("[createProject] Existing check response:", { existingProjects, checkError }); // Log check response
    
    if (checkError) {
        console.error("[createProject] Error checking existing projects:", checkError);
        throw checkError; // Re-throw check error
    }
    
    // Modify name if it already exists
    let uniqueName = name;
    if (existingProjects && existingProjects.length > 0) {
        console.log("[createProject] Found existing similar names, generating unique name...");
      // Find similar names and generate a name with an incremented number
      const similarNames = existingProjects.map(p => p.name);
      let counter = 1;
      
      while (similarNames.includes(uniqueName)) {
        uniqueName = `${name} (${counter})`;
        counter++;
      }
      console.log(`[createProject] Unique name generated: ${uniqueName}`);
    }

    console.log(`[createProject] Inserting project '${uniqueName}'...`); // Log before insert
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
      
    console.log("[createProject] Insert response:", { project, projectError }); // Log insert response

    if (projectError) {
        console.error("[createProject] Error inserting project:", projectError);
        throw projectError; // Re-throw insert error
    }
    
    // If initial content is provided, create first version and update HTML/semantic fields
    if (initialContent) {
        console.log(`[createProject] Initial content provided, updating project ID ${project.id}...`); // Log before update
      // Convert template to HTML
      const htmlOutput = convertTemplateToHtml(initialContent);
      
      // Update project with HTML and semantic data
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          current_html: htmlOutput,
          semantic_email: toJson(initialContent), // Use toJson helper 
          last_edited_at: new Date().toISOString(),
          // Make sure to set initial version number here
          version: 1 
        })
        .eq('id', project.id);
        
        console.log("[createProject] Update response:", { updateError }); // Log update response
        
      if (updateError) {
        console.error("[createProject] Error updating project after insert:", updateError);
        throw updateError; // Re-throw update error
      }
    }

    // Convert from database schema to our app schema
    // Fetch the potentially updated project data after the update
    console.log(`[createProject] Re-fetching project data for ID ${project.id}...`); // Log before select
    const { data: updatedProjectData, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', project.id)
        .single();
        
    console.log("[createProject] Final select response:", { updatedProjectData, fetchError }); // Log select response
        
    if (fetchError) {
        console.error("[createProject] Could not re-fetch project data after initial creation update:", fetchError);
        // Don't throw here, just warn and return potentially incomplete data
        console.warn("Returning potentially incomplete project data due to fetch error.");
        // Fallback to original data if re-fetch fails
         return {
          id: project.id,
          name: project.name,
          lastEditedAt: new Date(project.last_edited_at),
          createdAt: new Date(project.created_at),
          isArchived: project.is_archived,
          current_html: project.current_html, // Might be null if initialContent wasn't provided
          semantic_email: project.semantic_email, // Might be null
          version: project.version // Might be default/null
        } as Project;
    }
    
    // Return the fully populated project data
    console.log("[createProject] Successfully created and fetched project.");
    return {
      id: updatedProjectData.id,
      name: updatedProjectData.name,
      lastEditedAt: new Date(updatedProjectData.last_edited_at),
      createdAt: new Date(updatedProjectData.created_at),
      isArchived: updatedProjectData.is_archived,
      current_html: updatedProjectData.current_html,
      semantic_email: updatedProjectData.semantic_email,
      version: updatedProjectData.version
    } as Project;

  } catch (error) {
    // Log the raw error object structure as well
    console.error('[createProject] Error caught:', error);
    console.error('[createProject] Raw error structure:', JSON.stringify(error, null, 2)); 
    throw error;
  }
}

// New function to update project with email changes
export async function updateProjectWithEmailChanges(
  projectId: string,
  htmlOutput: string,
  updatedEmailTemplate: EmailTemplate
) {
  try {
    console.log("Updating project with email changes:", projectId);
    console.log("HTML output:", htmlOutput.substring(0, 100) + "...");
    console.log("Updated template:", JSON.stringify(updatedEmailTemplate).substring(0, 100) + "...");
    
    // Make sure the template ID is clean
    if (updatedEmailTemplate.id) {
      updatedEmailTemplate.id = cleanUuid(updatedEmailTemplate.id);
    }
    
    // Update the project last_edited_at timestamp and HTML content
    const { data, error } = await supabase
      .from('projects')
      .update({ 
        last_edited_at: new Date().toISOString(),
        current_html: htmlOutput,
        semantic_email: toJson(updatedEmailTemplate) // Use toJson helper
      })
      .eq('id', projectId)
      .select();

    if (error) {
      console.error("Error updating project:", error);
      handleSupabaseError(error);
      throw error;
    }
    
    console.log("Project updated successfully:", data);
    return true;
  } catch (error) {
    console.error('Error updating project with email changes:', error);
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
  // Ensure we have a clean ID for the template
  if (template.id) {
    template.id = cleanUuid(template.id);
  }
  
  // This is an enhanced version with better HTML generation
  let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${template.name}</title></head><body style="${styleObjectToString(template.styles || {})}">`;
  
  // Process each section
  template.sections.forEach(section => {
    // Skip sections marked for deletion
    if (section.pending && section.pendingType === 'delete') {
      return;
    }
    
    html += `<div style="${styleObjectToString(section.styles || {})}">`;
    
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
  const elementStyle = styleObjectToString(element.styles || {});
  
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
      if (element.styles && element.styles.href) {
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
  // Ensure styles is an object before calling Object.entries
  if (!styles || typeof styles !== 'object') {
    return '';
  }
  
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
    const { data, error } = await supabase
      .from('projects')
      // Select all needed fields, including the new ones
      .select(`
        id,
        name,
        last_edited_at,
        created_at,
        is_archived,
        current_html,
        semantic_email,
        version
      `)
      .eq('id', projectId)
      .single();

    if (error) handleSupabaseError(error);
    if (!data) throw new Error('Project not found');

    // Fetch related chat messages
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('id, project_id, content, created_at, role')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (chatError) handleSupabaseError(chatError);

    // Fetch related pending changes
    const { data: pendingChanges, error: changesError } = await supabase
      .from('pending_changes')
      .select('id, element_id, change_type, old_content, new_content, status')
      .eq('project_id', projectId)
      .eq('status', 'pending') // Only fetch pending changes
      .order('created_at', { ascending: true });

    if (changesError) handleSupabaseError(changesError);

    // Convert project data to our app schema
    const project: Project = {
      id: data.id,
      name: data.name,
      lastEditedAt: new Date(data.last_edited_at),
      createdAt: new Date(data.created_at),
      isArchived: data.is_archived,
      current_html: data.current_html, // Include current_html
      semantic_email: data.semantic_email as EmailTemplate | null, // Cast and include semantic_email
      version: data.version // Include version
    };

    // Convert chat messages
    const formattedMessages: ChatMessage[] = (chatMessages || []).map((msg: any) => ({
      id: msg.id,
      project_id: msg.project_id,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      role: msg.role
    }));

    // Convert pending changes
    const formattedChanges: PendingChange[] = (pendingChanges || []).map((chg: any) => ({
      id: chg.id,
      elementId: chg.element_id,
      changeType: chg.change_type,
      oldContent: chg.old_content,
      newContent: chg.new_content,
      status: chg.status
    }));

    return {
      project,
      // Kept emailContent mapping for backward compatibility if needed, but prefer semantic_email
      emailContent: data.semantic_email as EmailTemplate | null, 
      chatMessages: formattedMessages,
      pendingChanges: formattedChanges
    };

  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
}

// Save a chat message (updated signature)
export async function saveChatMessage(message: ChatMessage) {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: message.id, // Use ID from message object
        project_id: message.project_id,
        content: message.content,
        role: message.role || 'user' // Default to user if role is missing
      });

    if (error) handleSupabaseError(error);
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
    console.log(`Saving pending change for element ${elementId} of type ${changeType}`);
    console.log("Old content:", oldContent ? JSON.stringify(oldContent).substring(0, 100) + "..." : "null");
    console.log("New content:", newContent ? JSON.stringify(newContent).substring(0, 100) + "..." : "null");
    
    // Clean the element ID
    elementId = cleanUuid(elementId);
    
    const { data, error } = await supabase
      .from('pending_changes')
      .insert({
        project_id: projectId,
        element_id: elementId,
        change_type: changeType,
        old_content: oldContent ? toJson(oldContent) : null, // Use toJson helper
        new_content: newContent ? toJson(newContent) : null, // Use toJson helper
      })
      .select();

    if (error) {
      console.error("Error saving pending change:", error);
      handleSupabaseError(error);
      throw error;
    }
    
    console.log("Pending change saved successfully:", data);
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
        content: toJson(updatedEmailContent), // Use toJson helper
      });

    if (saveVersionError) throw saveVersionError;

    // We don't need to update the project here anymore as the changes are
    // already reflected when the pending change was created
    
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
  // Generate HTML from template
  const html = convertTemplateToHtml(template);
  
  // If we're exporting from a project, also save it to the database
  if (template.id) {
    try {
      // Try to update the current_html field of the project
      // We don't want to throw if this fails, as the primary goal is to return the HTML
      await supabase
        .from('projects')
        .update({ current_html: html })
        .eq('id', template.id);
    } catch (err) {
      console.error('Failed to update project HTML during export:', err);
    }
  }
  
  return html;
}

// Fetch pending changes for a project
export async function getPendingChanges(projectId: string): Promise<PendingChange[]> {
  if (!projectId) {
    console.warn("[getPendingChanges] Project ID is required, but was not provided.");
    return [];
  }
  console.log(`[getPendingChanges] Fetching for project ID: ${projectId}`);
  try {
    const { data, error } = await supabase
      .from('pending_changes')
      .select('*') // Select all columns from pending_changes
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }); // Optional: order by creation time

    if (error) {
      console.error(`[getPendingChanges] Error fetching pending changes for project ${projectId}:`, error);
      handleSupabaseError(error);
      return []; // Return empty array on error
    }

    console.log(`[getPendingChanges] Found ${data?.length || 0} pending changes.`);
    // Ensure the returned data matches the PendingChange type structure if necessary
    // For now, assume the table structure matches the type
    return data as PendingChange[];
  } catch (error) {
    console.error('[getPendingChanges] Unexpected error:', error);
    return []; // Return empty array on unexpected error
  }
}
