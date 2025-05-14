# main.py - Main orchestrator for the AI Blog Agent

import os
import json # For printing the final JSON payload neatly
import logging # Added logging
import asyncio # Added for running async notification
from dotenv import load_dotenv
from datetime import datetime, timezone # Added timezone
import telegram # Added: import the top-level telegram module

# Service imports
from modules.research_service import conduct_research
from modules.writing_service import generate_blog_post_components
from modules.supabase_service import format_for_supabase, post_blog_to_supabase
from modules.perplexity_service import fetch_breaking_news_topic
from modules.notification_service import (
    send_telegram_message, 
    create_bot_application, 
    register_handlers, 
    start_bot_polling,
    stop_bot_polling, 
    get_telegram_credentials 
)
from modules.job_manager import store_job_context, pop_job_context, get_job_context, DEFAULT_JOB_ID

# Telegram specific imports
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler, MessageHandler, filters

# Configure basic logging for main
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(module)s - %(message)s')

# Global variable for the bot application, initialized in main()
BOT_APP = None
# Global variable for the Telegram Chat ID, can be set by /start or from .env
TELEGRAM_CHAT_ID = None 

def escape_markdown_v2(text: str) -> str:
    """Escapes text for Telegram MarkdownV2 compatibility."""
    # Characters to escape for MarkdownV2
    escape_chars = r'_[]()~`>#+-=|{}.!'
    # Prepend \ to special characters. More robust library might be `telegram.utils.helpers.escape_markdown`.
    return "".join([f'\\{char}' if char in escape_chars else char for char in text])

# --- Telegram Handler Functions ---
async def start_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles the /start command from a user.
    Registers the user's chat ID for future communication and informs them the agent is active.
    """
    global TELEGRAM_CHAT_ID
    user = update.effective_user
    if user:
        TELEGRAM_CHAT_ID = str(user.id) # Store the user's chat ID globally for this session
        await update.message.reply_html(
            rf"Hello {user.mention_html()}! Your Chat ID {TELEGRAM_CHAT_ID} is registered. AI Blog Agent is active.",
        )
        logging.info(f"/start command received from user {user.id}. Chat ID set to {TELEGRAM_CHAT_ID}.")
        # Optionally, could trigger run_initial_pipeline_iteration() here if TELEGRAM_CHAT_ID was not previously set.
    else:
        await update.message.reply_text("Could not identify user.")
        logging.warning("/start command received but could not identify user.")


async def handle_publish_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles callbacks from inline keyboard buttons asking to publish or not.
    Callback data is expected to be 'publish_yes' or 'publish_no'.
    """
    query = update.callback_query
    await query.answer() # Acknowledge the callback query
    logging.info(f"Received callback_query data: {query.data}")
    
    # Retrieve the job context associated with this interaction
    job_ctx = pop_job_context() 
    if not job_ctx:
        logging.error("No job context found for publish_callback. Interaction might have timed out or been lost.")
        await query.edit_message_text(text="Sorry, context for this action was lost. Please try generating the blog post again.")
        return

    current_title_escaped = job_ctx.get("current_title_escaped", "this draft")

    if query.data == "publish_yes":
        # User wants to publish, ask for author name next.
        await query.edit_message_text(text=f"Okay, publishing *{current_title_escaped}*\\. Who should be the author? Please reply with the author\'s name.")
        # Update job context for the next step: awaiting author name
        store_job_context({**job_ctx, "next_action": "awaiting_author_name"})
    elif query.data == "publish_no":
        # User chose not to publish. Ask if they want to delete or rewrite.
        await query.edit_message_text(text=f"Draft *{current_title_escaped}* will not be published now.")
        delete_keyboard = [
            [InlineKeyboardButton("Yes, Delete Draft", callback_data="delete_draft_yes")], 
            [InlineKeyboardButton("No, Rewrite Draft", callback_data="delete_draft_no")]
        ]
        delete_reply_markup = InlineKeyboardMarkup(delete_keyboard)
        delete_prompt_message = f"Do you want to delete the draft *{current_title_escaped}* entirely, or would you like to provide instructions to rewrite it?"
        # Update job context for the next step: awaiting delete or rewrite choice
        store_job_context({**job_ctx, "next_action": "awaiting_delete_or_rewrite_choice"})
        # Send a new message with delete/rewrite options
        await context.bot.send_message(chat_id=query.message.chat_id, text=delete_prompt_message, reply_markup=delete_reply_markup, parse_mode=telegram.constants.ParseMode.MARKDOWN_V2)
    else:
        logging.warning(f"Unknown callback data received in handle_publish_callback: {query.data}")
        await query.edit_message_text(text="Sorry, I didn't understand that selection.")

async def handle_author_name_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles a regular text message when the agent is expecting an author's name.
    This is triggered after the user confirms they want to publish.
    """
    job_ctx = get_job_context() # Get context without popping, to check if we are awaiting this message
    if not job_ctx or job_ctx.get("next_action") != "awaiting_author_name":
        # This message is not an author name reply we are currently expecting.
        # It could be a random message or a command. Let other handlers manage it.
        logging.info(f"Received text message, but not currently awaiting author name. Text: {update.message.text}")
        return

    popped_job_ctx = pop_job_context() # Now that we've confirmed, pop the context for processing.
    author_name = update.message.text.strip()
    if not author_name: # Handle empty author name submission
        author_name = "AI Agent (Default)"
        await update.message.reply_text("No author name provided. Using default: AI Agent (Default)")
        
    supabase_payload = popped_job_ctx.get("supabase_payload")
    current_title_escaped = popped_job_ctx.get("current_title_escaped", "The Draft")
    original_topic = popped_job_ctx.get("original_topic", "Unknown topic") 

    if not supabase_payload:
        logging.error("Critical: No supabase_payload in context for author_name_message. Cannot publish.")
        await update.message.reply_text("Error: Blog post data is missing. Cannot publish.")
        return

    # Update payload with author, set as published, and add timestamp
    supabase_payload["author_id"] = author_name
    supabase_payload["is_published"] = True
    supabase_payload["published_at"] = datetime.now(timezone.utc).isoformat()
    logging.info(f"Author ID set to: '{author_name}'. Publishing '{current_title_escaped}' with timestamp: {supabase_payload['published_at']}")

    await update.message.reply_text(f"Got it! Attempting to publish *{current_title_escaped}* by *{escape_markdown_v2(author_name)}*\\.\\.\\.", parse_mode=telegram.constants.ParseMode.MARKDOWN_V2)
    
    # Perform the actual post to Supabase
    post_response = post_blog_to_supabase(supabase_payload)
    
    # Notify user of the outcome
    if post_response.get("success") or post_response.get("slug"):
        slug_info = post_response.get('slug', 'N/A')
        final_notification = f"""*Blog Post Published Successfully*\n\nTitle: {current_title_escaped}\nAuthor: {escape_markdown_v2(author_name)}\nSlug: `{escape_markdown_v2(slug_info)}`"""
        logging.info(f"Successfully posted to Supabase! Original Topic: {original_topic}, Slug: {slug_info}")
    else:
        error_detail = post_response.get('error', 'Unknown error during publishing')
        final_notification = f"""*Failed to Publish Blog Post*\n\nTitle: {current_title_escaped}\nError: {escape_markdown_v2(str(error_detail))}"""
        logging.error(f"Supabase post error for original topic '{original_topic}': {error_detail}")
    
    await send_telegram_message(final_notification, chat_id_to_send=str(update.message.chat_id))
    # After this, the interaction cycle for this blog post is complete.
    # The main loop might trigger a new `run_initial_pipeline_iteration` based on its logic (e.g., timer).

async def handle_delete_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles callbacks from inline keyboard buttons asking to delete the draft or not.
    Callback data is expected to be 'delete_draft_yes' or 'delete_draft_no'.
    'delete_draft_no' implies user wants to rewrite.
    """
    query = update.callback_query
    await query.answer()
    job_ctx = pop_job_context() # Pop context as a decision is being made.
    if not job_ctx:
        logging.error("No job context found for delete_callback.")
        await query.edit_message_text(text="Sorry, context for this action was lost.")
        return
    
    current_title_escaped = job_ctx.get("current_title_escaped", "this draft")

    if query.data == "delete_draft_yes":
        # User confirmed deletion.
        logging.info(f"User chose to delete draft: '{current_title_escaped}'.")
        await query.edit_message_text(text=f"Draft *{current_title_escaped}* has been discarded\\.", parse_mode=telegram.constants.ParseMode.MARKDOWN_V2)
        # Interaction cycle ends here for this draft.
    elif query.data == "delete_draft_no":
        # User chose not to delete, implying they want to rewrite.
        logging.info(f"User chose not to delete draft '{current_title_escaped}', proceeding to ask for rewrite instructions.")
        await query.edit_message_text(text=f"Okay, draft *{current_title_escaped}* kept. Please reply with your rewrite instructions.", parse_mode=telegram.constants.ParseMode.MARKDOWN_V2)
        # Update job context for the next step: awaiting rewrite instructions
        store_job_context({**job_ctx, "next_action": "awaiting_rewrite_instructions"})
    else:
        logging.warning(f"Unknown callback data received in handle_delete_callback: {query.data}")
        await query.edit_message_text(text="Sorry, I didn't understand that selection.")


async def handle_rewrite_instructions_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles a regular text message when the agent is expecting rewrite instructions.
    This is triggered after the user indicates they want to rewrite the draft.
    (Currently, this function only simulates the start of a rewrite process).
    """
    job_ctx = get_job_context() # Check context without popping
    if not job_ctx or job_ctx.get("next_action") != "awaiting_rewrite_instructions":
        # This message is not rewrite instructions we are currently expecting.
        logging.info(f"Received text message, but not currently awaiting rewrite instructions. Text: {update.message.text}")
        return

    popped_job_ctx = pop_job_context() # Pop context for processing
    rewrite_instructions = update.message.text.strip()
    current_title_escaped = popped_job_ctx.get("current_title_escaped", "The Draft")
    original_topic = popped_job_ctx.get("original_topic", "Unknown topic")
    persisted_research_brief = popped_job_ctx.get("research_brief") # Important for rewrite

    if not rewrite_instructions:
        await update.message.reply_text(f"No rewrite instructions received for *{current_title_escaped}*\\. If you want to try again, you can select the rewrite option again or start over.", parse_mode=telegram.constants.ParseMode.MARKDOWN_V2)
        # Re-store context if no instructions were given, allowing user to try sending instructions again or choose another path.
        # Or, consider asking again with options.
        store_job_context(popped_job_ctx) # Re-store to allow another attempt or different choice from previous state.
        return

    await update.message.reply_text(f"Okay, attempting to rewrite *{current_title_escaped}* with your feedback: \"_{escape_markdown_v2(rewrite_instructions)}_\"\\.\\.\\. (This is a placeholder, actual rewrite logic needs full implementation)", parse_mode=telegram.constants.ParseMode.MARKDOWN_V2)
    
    logging.info(f"Rewrite requested for topic '{original_topic}' with feedback: '{rewrite_instructions}'. Research brief available: {bool(persisted_research_brief)}")
    
    # --- TODO: Implement full rewrite pipeline --- 
    # 1. Decrement rewrite attempts (need to load MAX_REWRITE_ATTEMPTS from config or define globally, and pass in context).
    # 2. If attempts > 0:
    #    Call `generate_blog_post_components` again, passing `rewrite_instructions` and `persisted_research_brief` (as `initial_research_brief`).
    #    Then, call `format_for_supabase`.
    #    Then, send a new Telegram message with the new draft and publish/delete/rewrite options, similar to `run_initial_pipeline_iteration`.
    #    Store new context, including updated `max_rewrite_attempts`.
    # 3. If attempts <= 0:
    #    Inform user rewrite attempts are exhausted.
    #    Ask if they want to publish as is, or delete.
    # For now, simulation message:
    await send_telegram_message(f"Simulating rewrite for *{current_title_escaped}*\\. Backend logic to re-run pipeline with feedback is pending implementation\\.", chat_id_to_send=str(update.message.chat_id))
    # As this is a placeholder, we don't re-store context here, effectively ending this path until fully implemented.


# --- Main Blog Pipeline Logic ---
async def run_initial_pipeline_iteration():
    """
    Fetches a new news topic, generates a blog post draft, and prompts the user for initial action (publish or not).
    This is the starting point of a new blog post generation cycle.
    """
    global TELEGRAM_CHAT_ID
    if not TELEGRAM_CHAT_ID:
        # Agent cannot proactively send messages if no chat_id is known.
        logging.warning("TELEGRAM_CHAT_ID not set. Agent will wait for /start command from user before starting pipeline.")
        return 

    logging.info("Starting new blog generation cycle: Fetching initial breaking news topic...")
    initial_topic = fetch_breaking_news_topic()

    if not initial_topic:
        logging.info("No suitable breaking news topic found at this time.")
        # Optionally, notify the user if they are expecting a post, or just wait for next scheduled run.
        # await send_telegram_message("I checked for news, but didn't find a suitable topic to write about right now.", chat_id_to_send=TELEGRAM_CHAT_ID)
        return # End this iteration if no topic.

    current_topic_for_pipeline = initial_topic.strip("'\"") # Clean up potential quotes from topic
    logging.info(f"--- Starting Blog Generation for Topic: '{current_topic_for_pipeline}' --- ")

    # Phase 1a: Research
    research_brief = conduct_research(current_topic_for_pipeline)
    if not research_brief or (isinstance(research_brief, str) and research_brief.startswith("Error:")):
        logging.error(f"Research phase failed for topic '{current_topic_for_pipeline}'. Error: {research_brief}")
        await send_telegram_message(f"Sorry, I encountered an error during the research phase for topic: *{escape_markdown_v2(current_topic_for_pipeline)}*", chat_id_to_send=TELEGRAM_CHAT_ID)
        return

    # Phase 1b: Writing
    blog_components = generate_blog_post_components(current_topic_for_pipeline, research_brief)
    if blog_components.get("error"):
        logging.error(f"Writing phase failed for topic '{current_topic_for_pipeline}'. Error: {blog_components.get('error')}")
        await send_telegram_message(f"Sorry, I encountered an error during the writing phase for topic: *{escape_markdown_v2(current_topic_for_pipeline)}*", chat_id_to_send=TELEGRAM_CHAT_ID)
        return
        
    # Phase 1c: Formatting for Supabase (payload creation)
    supabase_payload = format_for_supabase(blog_components)
    if not supabase_payload or not supabase_payload.get("title"): # Basic check for valid payload
        logging.error(f"Formatting phase failed for topic '{current_topic_for_pipeline}'. Invalid payload generated.")
        await send_telegram_message(f"Sorry, I encountered an error preparing the data for topic: *{escape_markdown_v2(current_topic_for_pipeline)}*", chat_id_to_send=TELEGRAM_CHAT_ID)
        return

    current_title_escaped = escape_markdown_v2(supabase_payload.get("title", "Untitled Draft"))
    
    # Prepare initial prompt for Telegram: Publish Yes/No?
    publish_keyboard = [
        [InlineKeyboardButton("Yes, Publish This Draft", callback_data="publish_yes")], 
        [InlineKeyboardButton("No, Don't Publish Now", callback_data="publish_no")]
    ]
    publish_reply_markup = InlineKeyboardMarkup(publish_keyboard)
    
    # Construct message including a brief overview
    excerpt_preview = blog_components.get("excerpt", "No excerpt available.")
    approval_message = (
        f"*New Blog Post Draft Ready for Review*\n\n"
        f"Topic: *{escape_markdown_v2(current_topic_for_pipeline)}*\n"
        f"Title: *{current_title_escaped}*\n"
        f"Excerpt: _{escape_markdown_v2(excerpt_preview)}_\n\n"
        f"Proceed with publishing?"
    )
    
    # Store essential data in job context for next steps
    context_to_store = {
        "supabase_payload": supabase_payload, # The data to eventually post
        "current_title_escaped": current_title_escaped, # For display in Telegram messages
        "original_topic": current_topic_for_pipeline, # For reference and potential rewrites
        "research_brief": research_brief, # To be reused if rewrite is requested
        "next_action": "awaiting_publish_confirmation" # Expected action after this message
        # MAX_REWRITE_ATTEMPTS should be loaded from config and included here if rewrite logic is implemented.
    }
    store_job_context(context_to_store)
    logging.info(f"Context stored for job '{DEFAULT_JOB_ID}' (awaiting_publish_confirmation) for topic '{current_topic_for_pipeline}'.")

    await send_telegram_message(approval_message, chat_id_to_send=TELEGRAM_CHAT_ID, reply_markup=publish_reply_markup)
    logging.info("Publish confirmation message sent to Telegram. Bot is now waiting for user interaction.")


# --- Main Execution ---
async def main():
    """Initializes and runs the AI Blog Agent bot."""
    global BOT_APP, TELEGRAM_CHAT_ID # Allow modification of global variables

    logging.info("===== AI Blog Agent Orchestrator Starting (Async Main) =====")
    
    # Load environment variables from .env file located in the script's parent directory
    project_root_main = os.path.dirname(os.path.abspath(__file__))
    dotenv_path_main = os.path.join(project_root_main, ".env")
    if os.path.exists(dotenv_path_main):
        load_dotenv(dotenv_path=dotenv_path_main)
        logging.info(f"Successfully loaded .env file from: {dotenv_path_main}")
    else:
        logging.warning(f".env file not found at {dotenv_path_main}. Ensure it exists and contains necessary API keys/tokens.")

    # Attempt to load default Telegram Chat ID from environment (set via config.yaml spec)
    _, configured_chat_id = get_telegram_credentials() # This function loads .env again, which is fine.
    if configured_chat_id:
        TELEGRAM_CHAT_ID = configured_chat_id
        logging.info(f"Default TELEGRAM_CHAT_ID '{TELEGRAM_CHAT_ID[:4]}...' loaded from environment.")
    else:
        logging.info("Default TELEGRAM_CHAT_ID not found in environment. Bot will wait for /start command to get it.")

    # Create the Telegram Bot Application
    BOT_APP = create_bot_application()
    if not BOT_APP:
        logging.critical("Failed to create Telegram Bot Application. Essential credentials might be missing. Exiting.")
        return # Cannot proceed without the bot application

    # Define handlers for different types of Telegram updates
    # Command Handlers: Respond to specific commands (e.g., /start)
    command_handlers_map = {"start": start_command_handler}
    
    # Message Handlers: Respond to text messages that are not commands.
    # The order can be important if filters are not mutually exclusive.
    # Custom filters (like a MessageContentFilter if implemented) could be used for more precise routing based on job_context.
    # Current approach: handlers internally check job_context["next_action"].
    message_handlers_list = [
        (filters.TEXT & ~filters.COMMAND, handle_author_name_message), 
        (filters.TEXT & ~filters.COMMAND, handle_rewrite_instructions_message) 
    ]
    
    # Callback Query Handlers: Respond to button presses from inline keyboards.
    callback_query_handlers_list = [
        handle_publish_callback,  
        handle_delete_callback    
    ]

    # Register all defined handlers with the bot application
    register_handlers(BOT_APP, 
                      command_handlers=command_handlers_map,
                      message_handlers=message_handlers_list, 
                      callback_query_handlers=callback_query_handlers_list)

    # Initialize and start the bot's polling mechanism to listen for updates
    await start_bot_polling(BOT_APP) 

    # If a CHAT_ID is known (either from .env or a previous /start), trigger an initial pipeline run.
    # This allows the bot to start working immediately if configured with a chat ID.
    if TELEGRAM_CHAT_ID:
        logging.info("Initial TELEGRAM_CHAT_ID is set. Triggering one initial pipeline iteration.")
        # Running as a task so it doesn't block the bot startup or other operations.
        asyncio.create_task(run_initial_pipeline_iteration())
    else:
        logging.info("Agent started successfully. Waiting for user to send /start to the bot to register chat and begin operations.")

    logging.info("AI Blog Agent Bot is now running and polling for updates. Press Ctrl+C to stop.")
    try:
        # Keep the main script alive indefinitely while the bot polls in the background.
        # The actual work (fetching news, generating content, interacting) happens in the event-driven handlers
        # or tasks initiated by them or by a periodic trigger.
        while True:
            await asyncio.sleep(3600) # Sleep for an hour. Bot continues polling.
            # --- Optional Periodic Task --- 
            # If desired, a periodic check can be added here to automatically fetch new topics
            # if no interaction is currently pending.
            # Example:
            # if TELEGRAM_CHAT_ID and not get_job_context(DEFAULT_JOB_ID):
            #     logging.info("Periodic check: No active job, triggering new topic research and pipeline.")
            #     asyncio.create_task(run_initial_pipeline_iteration())
            # --- End Optional Periodic Task ---

    except KeyboardInterrupt:
        logging.info("KeyboardInterrupt received. Initiating graceful shutdown...")
    except Exception as e:
        # Catch any other unexpected exceptions in the main loop to log them before shutdown.
        logging.error(f"Unhandled exception in main keep-alive loop: {e}", exc_info=True)
    finally:
        # Gracefully stop the bot and clean up.
        logging.info("Shutting down bot polling and application...")
        if BOT_APP:
            await stop_bot_polling(BOT_APP)
        logging.info("===== AI Blog Agent Orchestrator Finished =====")

if __name__ == "__main__":
    # Entry point for running the bot directly.
    try:
        asyncio.run(main())
    except RuntimeError as e:
        # Handle a common error on shutdown where the event loop is already closed.
        if "Event loop is closed" in str(e):
            logging.info("Event loop closed, expected during shutdown sequence.")
        else:
            raise e # Re-raise other runtime errors 