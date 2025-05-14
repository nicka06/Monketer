# research_service.py

import os
import yaml
import requests # For making HTTP requests to Perplexity API
from dotenv import load_dotenv

# Utility to load config
def load_config():
    current_script_dir = os.path.dirname(__file__) # ai_blog_agent/modules
    config_path = os.path.join(current_script_dir, "../config.yaml") 
    config_path = os.path.normpath(config_path)
    try:
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        print(f"Error: config.yaml not found at {config_path}")
        return None
    except Exception as e:
        print(f"Error loading or parsing config.yaml: {e}")
        return None

def conduct_research(topic: str) -> str:
    """
    Conducts research on a given topic by querying the Perplexity API.
    Returns a research brief.
    """
    print(f"[Research Service] Starting research with Perplexity for topic: '{topic}'")
    
    # Load .env from the project root (one level up from modules/)
    dotenv_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "../.env"))
    load_dotenv(dotenv_path=dotenv_path)
    
    config = load_config()
    if not config:
        return "Error: Failed to load configuration."

    perplexity_api_key_env = config.get('perplexity', {}).get('api_key_env', 'PERPLEXITY_API_KEY')
    perplexity_api_key = os.getenv(perplexity_api_key_env)
    if not perplexity_api_key:
        print(f"Error: {perplexity_api_key_env} not found in .env file or environment.")
        return f"Error: {perplexity_api_key_env} not found."

    # Get Perplexity API configurations from config.yaml
    default_perplexity_model = "sonar-small-32k-online" # Default if not in config
    perplexity_model = config.get('perplexity', {}).get('model_name', default_perplexity_model)
    
    default_system_prompt = "You are an AI research assistant. Provide a comprehensive research brief." 
    system_prompt_content = config.get('prompts', {}).get(
        'perplexity_research_system', 
        default_system_prompt
    )

    api_url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {perplexity_api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payload = {
        "model": perplexity_model,
        "messages": [
            {"role": "system", "content": system_prompt_content},
            {"role": "user", "content": topic}
        ]
        # Optional parameters like temperature, max_tokens can be added here if needed
        # and managed via config.yaml if desired.
        # "temperature": 0.7, 
        # "max_tokens": 1000,
    }

    try:
        print(f"[Research Service] Querying Perplexity API with model: {perplexity_model}...")
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)

        response_data = response.json()
        
        # Standard Perplexity API response structure for chat completions:
        # {"choices": [{"message": {"content": "..."}}]}
        if response_data.get("choices") and len(response_data["choices"]) > 0:
            message = response_data["choices"][0].get("message", {})
            research_brief = message.get("content", "")
            if not research_brief.strip():
                 print("[Research Service] Perplexity API response content is empty.")
                 return "Error: Perplexity API returned empty content."
        else:
            error_detail = response_data.get("error", {}).get("message", "No additional error detail.")
            print(f"[Research Service] Unexpected response structure or error from Perplexity API: {response_data}")
            return f"Error: Unexpected response from Perplexity API. Detail: {error_detail}"

        print(f"[Research Service] Research completed for topic: '{topic}'")
        return research_brief

    except requests.exceptions.HTTPError as http_err:
        error_body = "unknown error"
        try:
            error_body = response.json() # Try to get JSON error body
        except ValueError: # If response is not JSON
            error_body = response.text
        print(f"[Research Service] HTTP error occurred: {http_err} - Response: {error_body}")
        return f"Error from Perplexity API (HTTP {response.status_code}): {error_body}"
    except requests.exceptions.RequestException as req_err:
        print(f"[Research Service] Request error occurred: {req_err}")
        return f"Error during Perplexity API request: {req_err}"
    except Exception as e:
        print(f"[Research Service] An unexpected error occurred: {e}")
        return f"An unexpected error occurred during research: {e}" 