# notification_service.py
"""
Handles Telegram bot interactions for the AI Blog Agent.

This module is responsible for:
- Sending messages (including those with inline keyboards) to users via Telegram.
- Creating and configuring the core Telegram bot application instance.
- Providing a mechanism to register command, message, and callback query handlers 
  (which are defined in the main orchestrator, main.py).
- Starting and stopping the bot's polling mechanism to listen for and process 
  incoming updates from Telegram.
"""

import os
import yaml
import logging
from dotenv import load_dotenv # To load .env if run standalone for testing
import telegram # From python-telegram-bot library
import asyncio # For running async main_test
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

# Imports for bot application and handlers
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from telegram import Update # For type hinting in handlers

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(module)s - %(message)s')

# Global placeholder for the bot application instance, managed by create_bot_application.
_bot_app_instance: Application | None = None

def load_config():
    """Loads the YAML configuration file (config.yaml)."""
    config_path = os.path.join(os.path.dirname(__file__), '..', 'config.yaml')
    try:
        with open(config_path, 'r') as stream:
            return yaml.safe_load(stream)
    except FileNotFoundError:
        logging.error(f"Configuration file not found at {config_path}")
        return None
    except yaml.YAMLError as exc:
        logging.error(f"Error parsing YAML configuration: {exc}")
        return None

def get_telegram_credentials() -> tuple[str | None, str | None]:
    """
    Loads Telegram bot token and default chat ID from environment variables 
    as specified in the configuration file.

    The .env file should define the environment variables whose names are listed
    in config.yaml (e.g., TELEGRAM_BOT_TOKEN_VAR_NAME, TELEGRAM_CHAT_ID_VAR_NAME).

    Returns:
        A tuple containing (bot_token, chat_id). Either can be None if not found.
    """
    project_root = os.path.dirname(os.path.abspath(__file__))
    dotenv_path = os.path.join(project_root, '..', ".env")
    load_dotenv(dotenv_path=dotenv_path)
    
    config = load_config()
    if not config or 'telegram' not in config:
        logging.error("Telegram configuration section not found in config.yaml.")
        return None, None

    bot_token_env_name = config['telegram'].get('bot_token_env')
    chat_id_env_name = config['telegram'].get('chat_id_env')

    if not bot_token_env_name or not chat_id_env_name:
        logging.error("Environment variable names for Telegram bot token or chat ID missing in config.yaml.")
        return None, None

    bot_token = os.getenv(bot_token_env_name)
    chat_id = os.getenv(chat_id_env_name)

    if not bot_token:
        logging.error(f"Telegram bot token not found using env var name '{bot_token_env_name}'.")
    if not chat_id:
        # This might be okay if chat_id is obtained dynamically (e.g. via /start command)
        logging.info(f"Default Telegram chat ID not found using env var name '{chat_id_env_name}'. It might be set dynamically.")
        
    return bot_token, chat_id

async def send_telegram_message(message: str, chat_id_to_send: str | None = None, reply_markup: InlineKeyboardMarkup | None = None) -> bool:
    """
    Sends a message to a specified Telegram chat using a new Bot instance for each call.
    
    This function is suitable for one-off messages. For messages sent from within
    bot handlers (callbacks, commands), it's generally better to use methods like
    `update.message.reply_text()` or `context.bot.send_message()` which use the 
    existing bot application context.

    Args:
        message: The message string to send (MarkdownV2 format).
        chat_id_to_send: The target chat ID. If None, attempts to use the default 
                         chat ID from configuration.
        reply_markup: Optional. An InlineKeyboardMarkup for interactive buttons.

    Returns:
        True if the message was sent successfully, False otherwise.
    """
    bot_token, default_chat_id = get_telegram_credentials()

    if not bot_token:
        # Error already logged by get_telegram_credentials
        return False 
    
    target_chat_id = chat_id_to_send if chat_id_to_send else default_chat_id
    if not target_chat_id:
        logging.error("Target chat ID for Telegram message is not available (neither provided nor in config).")
        return False

    try:
        # Create a temporary Bot instance for this one-off message.
        # This is acceptable for messages initiated by the agent itself outside of a handler flow.
        bot = telegram.Bot(token=bot_token)
        logging.info(f"Attempting to send Telegram message to chat ID ending in ...{target_chat_id[-4:]}")
        await bot.send_message(
            chat_id=target_chat_id, 
            text=message, 
            parse_mode=telegram.constants.ParseMode.MARKDOWN_V2,
            reply_markup=reply_markup
        )
        logging.info("Telegram message sent successfully via temporary bot instance.")
        return True
    except telegram.error.TelegramError as e:
        logging.error(f"Telegram API error while sending message: {e} - {e.message}")
        return False
    except Exception as e:
        logging.error(f"An unexpected error occurred while sending Telegram message: {e}")
        return False

def create_bot_application() -> Application | None:
    """
    Creates, configures, and returns the Telegram bot Application instance.

    This instance is central to running the bot and handling updates. It uses the
    bot token retrieved via `get_telegram_credentials()`.

    Returns:
        The initialized Application object, or None if creation fails (e.g., missing token).
    """
    global _bot_app_instance
    bot_token, _ = get_telegram_credentials() # Chat ID not needed for app creation
    if not bot_token:
        logging.error("Cannot create bot application: Bot token is missing.")
        return None

    application = Application.builder().token(bot_token).build()
    _bot_app_instance = application # Store globally for potential access, though passing it is cleaner.
    logging.info("Telegram Bot Application created successfully.")
    return application

def register_handlers(application: Application, 
                      command_handlers_map: dict[str, callable] | None = None, 
                      message_handlers_list: list[tuple[filters.BaseFilter, callable]] | None = None, 
                      callback_query_handlers_list: list[callable] | None = None):
    """
    Registers command, message, and callback query handlers with the bot application.

    The actual handler functions (callables) are defined in `main.py` and passed here.

    Args:
        application: The Application instance to register handlers with.
        command_handlers_map: A dictionary where keys are command names (e.g., "start") 
                                and values are the corresponding handler functions.
        message_handlers_list: A list of tuples, where each tuple contains 
                               (telegram.ext.filters.BaseFilter, handler_function).
        callback_query_handlers_list: A list of handler functions for callback queries 
                                      (from inline keyboard button presses).
    """
    if not application:
        logging.error("Cannot register handlers: Bot application is not initialized.")
        return

    if command_handlers_map:
        for command, handler_func in command_handlers_map.items():
            application.add_handler(CommandHandler(command, handler_func))
            logging.info(f"Registered command handler for '/{command}'.")

    if message_handlers_list:
        for msg_filter, handler_func in message_handlers_list:
            application.add_handler(MessageHandler(msg_filter, handler_func))
            # Logging the filter object itself can be verbose; logging its type might be better if needed.
            logging.info(f"Registered message handler: {handler_func.__name__ if hasattr(handler_func, '__name__') else 'anonymous_message_handler'} with filter.") 
            
    if callback_query_handlers_list:
        for handler_func in callback_query_handlers_list:
            application.add_handler(CallbackQueryHandler(handler_func))
            logging.info(f"Registered callback query handler: {handler_func.__name__ if hasattr(handler_func, '__name__') else 'anonymous_callback_handler'}")

async def start_bot_polling(application: Application):
    """
    Initializes and starts the bot's polling mechanism to listen for updates from Telegram.

    This function should be called after all handlers are registered.
    It starts the update fetching process but does not block indefinitely itself.
    The main application (main.py) will typically keep the script alive.

    Args:
        application: The initialized Application instance.
    """
    if not application:
        logging.error("Bot application not initialized. Cannot start polling.")
        return
    
    logging.info("Initializing and starting Telegram bot polling...")
    await application.initialize()  # Initializes handlers, bot, etc.
    await application.start()       # Starts fetching updates in the background.
    await application.updater.start_polling(poll_interval=1.0) # Starts the polling loop.
    logging.info("Telegram bot polling is now active and listening for updates.")
    # For indefinite running, main.py will use a loop or application.idle() if it takes over the main thread.

async def stop_bot_polling(application: Application):
    """
    Gracefully stops the bot's polling mechanism and shuts down the application.

    Args:
        application: The Application instance to stop.
    """
    if application and application.updater and application.updater.running:
        logging.info("Stopping Telegram bot polling...")
        await application.updater.stop()
        logging.info("Polling stopped.")
        await application.stop()
        logging.info("Application.stop() called.")
        await application.shutdown()
        logging.info("Telegram bot application shut down gracefully.")
    elif application:
        logging.info("Bot polling was not running, but attempting shutdown.")
        await application.shutdown() # Attempt shutdown even if polling wasn't active
    else:
        logging.info("No bot application instance to stop.") 