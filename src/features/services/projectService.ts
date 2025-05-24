import { supabase, handleSupabaseError, toJson } from '@/integrations/supabase/client';
// import { cleanUuid } from '@/integrations/supabase/client'; // Removed - now importing from uuid-utils
import { Project, EmailTemplate, PendingChange, ChatMessage, EmailElement, EmailSection } from '@/features/types/editor';
import { cleanUuid } from '@/lib/uuid-utils'; // Import from new location
// import { SupabaseClient } from '@supabase/supabase-js'; // No longer needed as parameter
import { generateId } from '@/lib/uuid'; // Used for default template
// Import V2 types and services
import { EmailTemplate as EmailTemplateV2 } from '../types';
import { HtmlGeneratorV2 } from './htmlGenerator'; // Import V2 Generator from local path

// --- Default Email Template --- 
// const defaultSemanticTemplate: EmailTemplate = { ... }; // Removed

// --- Default V2 Email Template --- 
// const defaultSemanticTemplateV2: EmailTemplateV2 = { ... }; // Removed

// --- Simple Client-Side HTML Generator (Matches basic structure of backend) ---
function generateBasicHtml(template: EmailTemplate): string {
    const globalStyles = template.styles.globalCss || '';
    let bodyContent = '';

    template.sections.forEach(section => {
        const sectionStyles = Object.entries(section.styles || {}).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v};`).join('');
        let sectionElementsHtml = '';
        
        section.elements.forEach(element => {
            const elementStyles = Object.entries(element.styles || {}).map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v};`).join('');
            let elementHtml = '';
            switch(element.type) {
                case 'header':
                    elementHtml = `<h1 id="${element.id}" style="margin:0; ${elementStyles}">${element.content}</h1>`;
                    break;
                case 'text':
                    elementHtml = `<p id="${element.id}" style="margin:0; ${elementStyles}">${element.content}</p>`;
                    break;
                case 'button': // Basic button rendering
                    // Note: This is simpler than the backend's table-based button for compatibility.
                    // It might look different in some email clients.
                    elementHtml = `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: auto; ${elementStyles}"><tr><td style="text-align: center;" bgcolor="#007bff"><a href="#" target="_blank" id="${element.id}" style="display: inline-block; color: #ffffff; background: #007bff; border: solid 1px #007bff; border-radius: 5px; box-sizing: border-box; cursor: pointer; text-decoration: none; font-size: 14px; font-weight: bold; margin: 0; padding: 12px 25px; text-transform: capitalize; border-color: #007bff;">${element.content}</a></td></tr></table>`;
                    break;
                 case 'spacer': // Add basic spacer rendering
                    elementHtml = `<div id="${element.id}" style="height: ${element.styles?.height || '20px'}; ${elementStyles}"></div>`; // Assuming height is in styles
                    break;
                // Add other element types as needed (image, divider etc.)
                default:
                     elementHtml = `<div id="${element.id}" style="${elementStyles}">Unsupported element: ${element.type}</div>`;
            }
            // Wrap each element for potential padding/margin from styles
            sectionElementsHtml += `<tr><td style="padding: 5px 10px;">${elementHtml}</td></tr>`; 
        });

        bodyContent += `
            <!-- Section Start: ${section.id} -->
            <tr>
                <td id="section-${section.id}" style="${sectionStyles}">
                    <table role="presentation" style="width:100%; border-collapse:collapse; border:0; border-spacing:0;">
                        ${sectionElementsHtml}
                    </table>
                </td>
            </tr>
            <!-- Section End: ${section.id} -->
        `;
    });

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${template.name}</title>
            <style>
                /* Basic Resets */
                body { margin: 0; padding: 0; font-family: sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
                table { border-collapse: collapse; border-spacing: 0; }
                td { padding: 0; vertical-align: top; }
                img { border: 0; -ms-interpolation-mode: bicubic; max-width: 100%; }
                a { text-decoration: none; color: inherit; }
                /* Global Styles */
                ${globalStyles}
            </style>
        </head>
        <body style="margin:0; padding:0; word-spacing:normal;">
            <table role="presentation" style="width:100%; border-collapse:collapse; border:0; border-spacing:0; background:#ffffff;">
                <tr>
                    <td align="center" style="padding:0;">
                        <table role="presentation" class="email-container" style="width:602px; max-width: 602px; border-collapse:collapse; border:1px solid #cccccc; border-spacing:0; text-align:left;">
                            ${bodyContent}
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `.trim();
}

// --- Project Service Functions (Consolidated) --- 

export const createProject = async (title: string): Promise<Project | null> => {
  let currentUserId: string | undefined;
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      console.error('Error fetching user for project creation:', authError);
      throw new Error(authError?.message || 'User not authenticated');
    }
    currentUserId = authUser.id;

    // Fetch user_info to check subscription and project count BEFORE creating the project
    const { data: userInfo, error: userInfoError } = await supabase
      .from('user_info')
      .select('subscription_tier, project_count')
      .eq('auth_user_uuid', currentUserId)
      .single();

    if (userInfoError) {
      console.error('Error fetching user_info for project creation limit check:', userInfoError);
      throw new Error('Could not verify user subscription details to create project.');
    }

    if (!userInfo) {
      console.error('User_info not found for user:', currentUserId);
      throw new Error('User subscription information not found. Cannot create project.');
    }

    const projectLimits: { [key: string]: number } = {
      free: 1,
      pro: 25,
      premium: Infinity,
    };

    const currentTier = userInfo.subscription_tier as 'free' | 'pro' | 'premium';
    const limit = projectLimits[currentTier];

    if (limit === undefined) { // Should not happen if tiers are well-defined
        console.error(`Project limit not defined for tier: ${currentTier}`);
        throw new Error(`Project limit configuration error for your plan.`);
    }

    if (userInfo.project_count >= limit) {
      console.warn(`User ${currentUserId} attempted to create project while at limit (${userInfo.project_count}/${limit}) for tier ${currentTier}.`);
      throw new Error(`Project limit reached for your ${currentTier} plan. Please upgrade to create more projects.`);
    }

    // If all checks pass, proceed to create the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: title,
        user_id: currentUserId, // Use the fetched and validated user ID
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error inserting project:', projectError);
      throw projectError; // Propagate the Supabase error
    }
    if (!project) { // Should be caught by projectError, but as a safeguard
        throw new Error('Project creation failed silently after insert attempt.');
    }

    // Increment project count in user_info table
    const { error: rpcError } = await supabase.rpc('increment_project_count', {
      p_user_id: currentUserId
    });

    if (rpcError) {
      console.error('Error calling increment_project_count RPC:', rpcError);
      // If updating project count fails, delete the project to maintain consistency
      console.warn(`Attempting to roll back project creation (ID: ${project.id}) due to RPC error.`);
      await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);
      throw rpcError; // Propagate the RPC error
    }

    console.log(`Project "${title}" (ID: ${project.id}) created successfully for user ${currentUserId}. New project count should be ${userInfo.project_count + 1}.`);
    return project;
  } catch (error: any) {
    // Log the specific error message that will be shown to the user or handled by the caller
    console.error('Error in createProject service:', error.message);
    // It's often better for the caller (e.g., EditorContext) to handle toast notifications
    // so they are consistent with other UI interactions.
    // The function will return null, and the caller can check for this and the error message.
    throw error; // Re-throw the error to be caught by the calling function
  }
};

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
      console.log(`[getProjectByNameAndUsername] Primary lookup: user.id=${user.id}, projectName=${projectName}`);
      // Find the project by name and user ID
      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', projectName)
        .limit(1);
        
      console.log('[getProjectByNameAndUsername] Primary lookup result:', JSON.stringify({ projects, projectError }, null, 2));
      
      if (projectError) {
        console.error('[getProjectByNameAndUsername] Primary lookup projectError:', projectError);
        throw projectError;
      }
      
      if (!projects || projects.length === 0) {
        // Don't throw 'Project not found' here yet, let the fallback try
        console.log(`[getProjectByNameAndUsername] Project '${projectName}' not found for authenticated user ${user.id} via primary lookup, trying fallback.`);
      } else {
        console.log(`[getProjectByNameAndUsername] Project '${projectName}' FOUND for authenticated user ${user.id} via primary lookup.`);
        return projects[0]; // Project found for authenticated user
      }
    }
    
    // Fallback: Try to find the user in user_info by username (email) and use their auth_user_uuid
    console.log(`Fallback: Attempting to find user '${username}' in user_info and use auth_user_uuid.`);
    const { data: userInfo, error: userError } = await supabase
      .from('user_info')
      .select('auth_user_uuid') // Select the new auth_user_uuid column
      .eq('username', username) // Assuming 'username' column in user_info stores the email
      .single();
      
    if (userError || !userInfo || !userInfo.auth_user_uuid) {
      // If user not found in user_info or auth_user_uuid is missing, then throw User not found
      console.error('User not found in user_info or auth_user_uuid is missing:', userError || 'No userInfo or auth_user_uuid');
      throw new Error('User not found'); 
    }
    
    // Find the project by name and the auth_user_uuid from user_info
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userInfo.auth_user_uuid) // Use the auth_user_uuid
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
        semantic_email_v2,
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

    // Fetch related pending changes - V2 structure
    const { data: pendingChangesDataV2, error: pendingChangesErrorV2 } = await supabase
      .from('pending_changes')
      .select('id, project_id, batch_id, change_type, target_id, target_parent_id, old_content, new_content, status, ai_rationale, created_at, updated_at')
      .eq('project_id', projectId)
      .eq('status', 'pending') // Fetch all statuses, filtering can happen in context if needed, or keep for only pending
      .order('created_at', { ascending: true });

    if (pendingChangesErrorV2) {
      handleSupabaseError(pendingChangesErrorV2);
    }

    // Map project data
    const project: Project = {
      id: data.id,
      name: data.name,
      lastEditedAt: new Date(data.last_edited_at),
      createdAt: new Date(data.created_at),
      isArchived: data.is_archived,
      current_html: data.current_html,
      semantic_email: null, // V1 is null
      semantic_email_v2: data.semantic_email_v2 as EmailTemplateV2 | null, // Add missing field
      version: data.version
    };

    // Convert chat messages
    const formattedMessages: ChatMessage[] = (chatMessages || []).map((msg: any) => ({
      id: msg.id,
      project_id: msg.project_id,
      content: msg.content,
      timestamp: new Date(msg.created_at),
      role: msg.role
    }));

    // Convert pending changes (GranularPendingChange)
    // No complex mapping needed if all columns are selected and match the type
    const formattedGranularChanges: PendingChange[] = (pendingChangesDataV2 || []) as PendingChange[];

    // Ensure V2 conversion: If semantic_email_v2 is null, but V1 exists, attempt conversion
    let finalSemanticEmail: EmailTemplateV2 | null = null;

    return {
      project,
      // Kept emailContent mapping for backward compatibility if needed, but prefer semantic_email
      emailContent: data.semantic_email as EmailTemplate | null, 
      chatMessages: formattedMessages,
      pendingChanges: formattedGranularChanges // Use the correctly typed and fetched granular changes
    };

  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
}

// Save a chat message (updated signature)
export async function saveChatMessage(message: ChatMessage): Promise<ChatMessage | null> {
  try {
    // Explicitly list columns to insert, omitting timestamp (assuming DB uses created_at)
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
          id: message.id, 
          project_id: message.project_id,
          user_id: message.user_id,
          role: message.role,
          content: message.content,
          is_clarifying_chat: message.is_clarifying_chat,
          is_error: message.is_error,
          message_type: message.message_type
          // timestamp field removed, DB uses default created_at
      })
      .select()
      .single();

    if (error) throw error;
    // Ensure the returned data matches the ChatMessage type, especially if DB schema differs significantly for select response.
    return data as ChatMessage; 
  } catch (error) {
    console.error("Error saving chat message:", error);
    return null;
  }
}

// Save pending change
export async function savePendingChange(change: PendingChange) {
  try {
    const { data, error } = await supabase
      .from('pending_changes')
      .insert(change)
      .select()
      .single();

    if (error) throw error;
    return data as PendingChange;
  } catch (error) {
    console.error("Error saving pending change:", error);
    return null;
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
    const htmlOutput = generateBasicHtml(updatedEmailContent);

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

// Export the email as HTML (Updated for V2)
export async function exportEmailAsHtmlV2(template: EmailTemplateV2): Promise<string> {
    try {
        const htmlGenerator = new HtmlGeneratorV2();
        return htmlGenerator.generate(template);
    } catch (error) {
        console.error("Error exporting V2 email as HTML:", error);
        return `<p>Error generating HTML: ${error instanceof Error ? error.message : 'Unknown error'}</p>`;
    }
}

// Fetch pending changes for a project (updated to fetch all fields for GranularPendingChange)
export async function getPendingChanges(projectId: string): Promise<PendingChange[]> {
  if (!projectId) {
    console.warn("[getPendingChanges] Project ID is required, but was not provided.");
    return [];
  }
  console.log(`[getPendingChanges] Fetching for project ID: ${projectId}`);
  try {
    const { data, error } = await supabase
      .from('pending_changes')
      // Select all columns necessary for the GranularPendingChange type
      .select('id, project_id, batch_id, change_type, target_id, target_parent_id, old_content, new_content, status, ai_rationale, created_at, updated_at') 
      .eq('project_id', projectId)
      .eq('status', 'pending') // Keep fetching only 'pending' status changes as per original logic
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`[getPendingChanges] Error fetching pending changes for project ${projectId}:`, error);
      handleSupabaseError(error);
      return []; 
    }

    console.log(`[getPendingChanges] Found ${data?.length || 0} pending changes.`);
    // Data should directly match PendingChange[] (which is GranularPendingChange[])
    return (data || []) as PendingChange[];
  } catch (error) {
    console.error('[getPendingChanges] Unexpected error:', error);
    return []; 
  }
}

// Updates a project with the given data
export async function updateProject(projectId: string, dataToUpdate: Partial<Project>): Promise<Project | null> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update({ ...dataToUpdate, last_edited_at: new Date() })
      .eq('id', cleanUuid(projectId))
      .select()
      .single();

    if (error) throw error;
    return data as Project;
  } catch (error) {
    console.error(`Error updating project ${projectId}:`, error);
    return null;
  }
}

export async function getChatMessages(projectId: string): Promise<ChatMessage[]> {
  if (!projectId) {
    console.error("getChatMessages: projectId is required");
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching chat messages:", error);
      handleSupabaseError(error);
      return []; // Return empty array on error
    }
    return data as ChatMessage[];
  } catch (error) {
    console.error("Exception in getChatMessages:", error);
    return []; // Return empty array on exception
  }
}
