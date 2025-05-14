# perplexity_service.py
"""
Handles interactions with the Perplexity API for news sourcing and utilizes 
OpenAI for relevance checking and topic extraction.

This service is responsible for:
- Fetching recent news or developments based on configured keywords using Perplexity.
- Processing the news content with an OpenAI model to determine if it's a new development,
  relevant to the blog's scope, and to propose a suitable blog topic.
"""

import os
import yaml
import re
import requests # For Perplexity API
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI # For OpenAI relevance check
from langchain.schema import HumanMessage, SystemMessage
from openai import OpenAI # Corrected import
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Utility to load config
def load_config():
    """Loads the YAML configuration file."""
    # Adjust path to be relative to this file's location or use an absolute path
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

def _call_perplexity_api(system_prompt: str, user_prompt: str, api_key: str, model_name: str) -> str:
    """Helper function to make a call to the Perplexity API."""
    api_url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }
    try:
        print(f"[Perplexity Service] Querying Perplexity API with model: {model_name}...")
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()
        response_data = response.json()
        if response_data.get("choices") and len(response_data["choices"]) > 0:
            message = response_data["choices"][0].get("message", {})
            content = message.get("content", "")
            if content.strip():
                return content.strip()
            else:
                print("[Perplexity Service] Perplexity API response content is empty.")
                return ""
        else:
            print(f"[Perplexity Service] Unexpected response structure from Perplexity API: {response_data}")
            return ""
    except requests.exceptions.HTTPError as http_err:
        error_body = response.text if response else "No response body"
        print(f"[Perplexity Service] HTTP error: {http_err} - Response: {error_body}")
        return ""
    except Exception as e:
        print(f"[Perplexity Service] Error calling Perplexity API: {e}")
        return ""

def _call_openai_llm(system_prompt: str, user_prompt: str, llm: ChatOpenAI) -> str:
    """Helper function to make a call to an OpenAI LLM."""
    try:
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
        ai_response = llm.invoke(messages)
        return ai_response.content.strip()
    except Exception as e:
        print(f"[Perplexity Service] OpenAI LLM call failed: {e}")
        return ""

def _query_perplexity_api(api_key, model_name, system_prompt, user_prompt):
    """Helper function to query the Perplexity API."""
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }
    try:
        response = requests.post("https://api.perplexity.ai/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Error querying Perplexity API: {e}")
        if hasattr(e, 'response') and e.response is not None:
            logging.error(f"Perplexity API Response: {e.response.text}")
        return None

def _query_openai_api(api_key, model_name, system_prompt, user_prompt_template, news_item_content):
    """Helper function to query the OpenAI API for relevance check."""
    client = OpenAI(api_key=api_key)
    user_prompt = user_prompt_template.format(news_item_content=news_item_content)
    try:
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        return completion.choices[0].message.content
    except Exception as e:
        logging.error(f"Error querying OpenAI API: {e}")
        return None

def parse_relevance_check_output(output_str):
    """Parses the structured output from the OpenAI relevance check."""
    if not output_str:
        return None, None, None
    
    parsed_data = {}
    try:
        # Use splitlines() for robust handling of different newline characters
        lines = output_str.strip().splitlines()
        
        for line in lines:
            line_stripped = line.strip()
            if ':' in line_stripped:
                key, value = line_stripped.split(':', 1)
                parsed_data[key.strip()] = value.strip()
        
        is_new_str = parsed_data.get("NewDevelopment", "No").strip().lower()
        is_relevant_str = parsed_data.get("Relevant", "No").strip().lower()
        
        is_new = is_new_str == "yes"
        is_relevant = is_relevant_str == "yes"
        topic = parsed_data.get("ProposedTopic", "N/A").strip()
        
        if topic.lower() == "n/a" or not topic:
            topic = None
            
        return is_new, is_relevant, topic
    except Exception as e:
        logging.error(f"Error parsing relevance check output: {e}. Output was: '{output_str}'")
        return False, False, None

def fetch_breaking_news_topic():
    """
    Fetches recent news using Perplexity and then uses OpenAI to determine
    if any news item is a suitable, breaking blog topic.
    Returns a blog topic string or None.
    """
    # Load environment variables from .env in the project root
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=dotenv_path)

    config = load_config()
    if not config:
        return None

    perplexity_api_key = os.getenv(config['perplexity']['api_key_env'])
    openai_api_key = os.getenv(config['openai']['api_key_env'])

    if not perplexity_api_key:
        logging.error("Perplexity API key not found in environment variables.")
        return None
    if not openai_api_key:
        logging.error("OpenAI API key not found in environment variables.")
        return None

    # 1. Construct Perplexity User Prompt
    news_keywords = config['perplexity']['news_query_keywords']
    recency_addon = config['perplexity']['news_recency_prompt_addon']
    perplexity_user_prompt = f"Keywords: {news_keywords}. Focus: {recency_addon}. Return a list of recent news items or developments related to these keywords."

    # 2. Query Perplexity for News
    logging.info("Querying Perplexity for recent news...")
    perplexity_response = _query_perplexity_api(
        api_key=perplexity_api_key,
        model_name=config['perplexity']['model_name'],
        system_prompt=config['prompts']['perplexity_news_sourcing_system'],
        user_prompt=perplexity_user_prompt
    )

    if not perplexity_response or 'choices' not in perplexity_response or not perplexity_response['choices']:
        logging.error("No valid response or choices from Perplexity API.")
        return None

    # Perplexity might return one consolidated message. We need to understand its structure.
    # For now, let's assume the content of the first choice is what we need to parse or use.
    # This part might need adjustment based on the actual Perplexity API response format for such queries.
    # Let's assume the response contains a list of news items, or a text block we can process.
    # For simplicity, we'll treat the whole content as one "news item block" to be evaluated by OpenAI.
    # Ideally, Perplexity would return structured data or distinct items.
    # If Perplexity returns a single string with multiple news items, the relevance check needs to be robust.

    news_content_from_perplexity = perplexity_response['choices'][0]['message']['content']
    
    # If Perplexity returns multiple items in its content, we might need to split them.
    # However, the current relevance check prompt expects a single "News Item Summary/Content".
    # For a robust solution, we might need a preliminary step here to identify and separate individual news items
    # from `news_content_from_perplexity` if it's a long string with multiple distinct news.
    # For now, we'll send the whole block to OpenAI for evaluation. This simplifies the initial implementation.
    # The `news_max_results_to_consider` from config is not directly used here because we are
    # treating Perplexity's response as one block. If Perplexity returns multiple distinct choices,
    # we would iterate through `perplexity_response['choices']` up to `news_max_results_to_consider`.

    logging.info("Evaluating news content with OpenAI for relevance and topic extraction...")
    relevance_check_output = _query_openai_api(
        api_key=openai_api_key,
        model_name=config['perplexity']['news_topic_decision_model'], # Uses the model specified for decision making
        system_prompt=config['prompts']['news_relevance_check_system'],
        user_prompt_template=config['prompts']['news_relevance_check_user_template'],
        news_item_content=news_content_from_perplexity # Send the full output for now
    )

    if not relevance_check_output:
        logging.error("Failed to get relevance check output from OpenAI.")
        return None

    is_new, is_relevant, proposed_topic = parse_relevance_check_output(relevance_check_output)

    logging.info(f"OpenAI Relevance Check Result: New={is_new}, Relevant={is_relevant}, Topic='{proposed_topic}'")

    if is_new and is_relevant and proposed_topic:
        logging.info(f"Suitable breaking news topic found: '{proposed_topic}'")
        return proposed_topic
    else:
        logging.info("No suitable breaking news topic identified based on OpenAI's evaluation.")
        return None 