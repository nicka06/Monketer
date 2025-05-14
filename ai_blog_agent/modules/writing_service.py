# writing_service.py 
"""
Handles the generation of various components of a blog post, such as title, 
slug, content, category, and excerpt. It utilizes LLM calls for creative 
text generation and applies rewrite instructions if provided.
"""

import os
import yaml
import re
import logging # Added logging
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, SystemMessage

# Utility to load config
def load_config():
    current_script_dir = os.path.dirname(__file__) # ai_blog_agent/modules
    config_path = os.path.join(current_script_dir, "../config.yaml") 
    config_path = os.path.normpath(config_path)
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        logging.error(f"Error: config.yaml not found at {config_path}") # Changed to logging.error
        return None
    except Exception as e:
        logging.error(f"Error loading or parsing config.yaml: {e}") # Changed to logging.error
        return None

def _call_openai_llm(system_prompt: str, user_prompt: str, llm: ChatOpenAI) -> str:
    """Helper function to make a call to the OpenAI LLM."""
    try:
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        ai_response = llm.invoke(messages)
        return ai_response.content.strip()
    except Exception as e:
        logging.error(f"[Writing Service] LLM call failed: {e}") # Changed to logging.error
        return "" # Return empty string on error

def _generate_title_llm(topic: str, research_brief_overview: str, llm: ChatOpenAI, prompts_config: dict, rewrite_instructions: str | None = None) -> str:
    """Generates a blog post title using an LLM call."""
    logging.info("[Writing Service] Generating title...") # Changed to logging.info
    system_prompt = prompts_config.get('title_generation_system', "Generate a blog post title.")
    user_template = prompts_config.get('title_generation_user_template', "Topic: {topic}\nBrief: {research_brief_overview}\nTitle:")
    
    user_prompt = user_template.format(topic=topic, research_brief_overview=research_brief_overview)
    if rewrite_instructions:
        user_prompt = f"Rewrite Instructions: {rewrite_instructions}\n\n{user_prompt}"
        logging.info("[Writing Service] Added rewrite instructions to title prompt.") # Changed to logging.info

    return _call_openai_llm(system_prompt, user_prompt, llm)

def _create_slug_from_title(title: str) -> str:
    """Creates a URL-friendly slug from a given title."""
    logging.info("[Writing Service] Creating slug...") # Changed to logging.info
    if not title: return ""
    # Lowercase
    slug = title.lower()
    # Remove non-alphanumeric characters (except spaces and hyphens)
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    # Replace spaces with hyphens
    slug = re.sub(r'\s+', '-', slug)
    # Remove leading/trailing hyphens
    slug = slug.strip('-')
    # Limit length (optional, e.g., to 7 words equivalent or 50 chars)
    # For simplicity, we'll just return the full slug for now.
    # Consider max 7 words from prompt: split, take 7, join.
    slug_parts = slug.split('-')
    if len(slug_parts) > 7:
        slug = '-'.join(slug_parts[:7])
    return slug

def _generate_content_llm(topic: str, title: str, research_brief: str, llm: ChatOpenAI, prompts_config: dict, rewrite_instructions: str | None = None) -> str:
    """Generates the main blog post content using an LLM call."""
    logging.info("[Writing Service] Generating content...") # Changed to logging.info
    system_prompt = prompts_config.get('content_generation_system', "Write blog post content.")
    user_template = prompts_config.get('content_generation_user_template', "Topic: {topic}\nTitle: {title}\nBrief: {research_brief}\nContent:")
    
    user_prompt = user_template.format(topic=topic, title=title, research_brief=research_brief)
    if rewrite_instructions:
        user_prompt = f"Rewrite Instructions: {rewrite_instructions}\n\n{user_prompt}"
        logging.info("[Writing Service] Added rewrite instructions to content prompt.") # Changed to logging.info

    return _call_openai_llm(system_prompt, user_prompt, llm)

def _generate_category_llm(topic: str, content_summary: str, llm: ChatOpenAI, prompts_config: dict, rewrite_instructions: str | None = None) -> str:
    """Generates a blog post category using an LLM call."""
    logging.info("[Writing Service] Generating category...") # Changed to logging.info
    system_prompt = prompts_config.get('category_generation_system', "Suggest a category.")
    user_template = prompts_config.get('category_generation_user_template', "Topic: {topic}\nSummary: {content_summary}\nCategory:")
    
    user_prompt = user_template.format(topic=topic, content_summary=content_summary)
    if rewrite_instructions:
        # For category, rewrite instructions might be less direct, but we can still pass them.
        # The LLM might use them to adjust category based on tone or focus change.
        user_prompt = f"Rewrite Instructions: {rewrite_instructions}\n\n{user_prompt}"
        logging.info("[Writing Service] Added rewrite instructions to category prompt.") # Changed to logging.info

    return _call_openai_llm(system_prompt, user_prompt, llm)

def _generate_excerpt_llm(title: str, content_summary: str, llm: ChatOpenAI, prompts_config: dict, rewrite_instructions: str | None = None) -> str:
    """Generates a blog post excerpt using an LLM call."""
    logging.info("[Writing Service] Generating excerpt...") # Changed to logging.info
    system_prompt = prompts_config.get('excerpt_generation_system', "Write an excerpt.")
    user_template = prompts_config.get('excerpt_generation_user_template', "Title: {title}\nSummary: {content_summary}\nExcerpt:")

    user_prompt = user_template.format(title=title, content_summary=content_summary)
    if rewrite_instructions:
        user_prompt = f"Rewrite Instructions: {rewrite_instructions}\n\n{user_prompt}"
        logging.info("[Writing Service] Added rewrite instructions to excerpt prompt.") # Changed to logging.info

    return _call_openai_llm(system_prompt, user_prompt, llm)

def generate_blog_post_components(topic: str, research_brief: str, rewrite_instructions: str | None = None) -> dict:
    """
    Generates blog post components (title, slug, content, category, excerpt)
    by making separate LLM calls for each.
    Incorporates rewrite_instructions if provided.
    Returns a dictionary containing the components.
    """
    logging.info(f"[Writing Service] Starting component-wise blog post generation for topic: '{topic}'") # Changed to logging.info
    if rewrite_instructions:
        logging.info(f"[Writing Service] Rewrite instructions provided: '{rewrite_instructions}'") # Changed to logging.info

    dotenv_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "../.env"))
    load_dotenv(dotenv_path=dotenv_path)
    
    config = load_config()
    if not config:
        return {"error": "Failed to load configuration."}

    openai_api_key_env = config.get('openai', {}).get('api_key_env', 'OPENAI_API_KEY')
    openai_api_key = os.getenv(openai_api_key_env)
    if not openai_api_key:
        logging.error(f"Error: {openai_api_key_env} not found in .env file or environment.") # Changed to logging.error
        return {"error": f"{openai_api_key_env} not found."}

    writing_model_name = config.get('openai', {}).get('writing_model_name', 'gpt-3.5-turbo')
    prompts_config = config.get('prompts', {})
    
    blog_post_data = {
        "title": "",
        "slug": "",
        "content": "",
        "category": "",
        "excerpt": "",
        "error": None
    }

    try:
        llm = ChatOpenAI(model_name=writing_model_name, openai_api_key=openai_api_key, temperature=0.7)

        # For title generation, we might want to send a shorter overview of the brief
        research_brief_overview = (research_brief[:300] + '...') if len(research_brief) > 300 else research_brief
        
        blog_post_data["title"] = _generate_title_llm(topic, research_brief_overview, llm, prompts_config, rewrite_instructions)
        if not blog_post_data["title"]:
            blog_post_data["error"] = "Failed to generate title."
            return blog_post_data

        blog_post_data["slug"] = _create_slug_from_title(blog_post_data["title"])

        blog_post_data["content"] = _generate_content_llm(topic, blog_post_data["title"], research_brief, llm, prompts_config, rewrite_instructions)
        if not blog_post_data["content"]:
            blog_post_data["error"] = "Failed to generate content."
            return blog_post_data
        
        # Create a summary of the generated content for category and excerpt generation
        content_summary_for_cat = (blog_post_data["content"][:100] + '...') if len(blog_post_data["content"]) > 100 else blog_post_data["content"]
        content_summary_for_excerpt = (blog_post_data["content"][:150] + '...') if len(blog_post_data["content"]) > 150 else blog_post_data["content"]

        blog_post_data["category"] = _generate_category_llm(topic, content_summary_for_cat, llm, prompts_config, rewrite_instructions)
        # Category can be optional, so we don't error out if empty

        blog_post_data["excerpt"] = _generate_excerpt_llm(blog_post_data["title"], content_summary_for_excerpt, llm, prompts_config, rewrite_instructions)
        if not blog_post_data["excerpt"]:
            logging.warning("[Writing Service] Warning: Failed to generate excerpt. Proceeding without it.") # Changed to logging.warning
            blog_post_data["excerpt"] = "" # Default to empty if generation fails

        logging.info(f"[Writing Service] All blog post components generated successfully for topic: '{topic}'") # Changed to logging.info
        return blog_post_data

    except Exception as e:
        logging.error(f"[Writing Service] An critical error occurred during blog post generation: {e}") # Changed to logging.error
        blog_post_data["error"] = f"A critical error occurred: {e}"
        return blog_post_data 