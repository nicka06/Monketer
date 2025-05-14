# ai_blog_agent/modules/job_manager.py
"""
Manages the context of an active interaction or job within the AI Blog Agent.

This module provides a simple in-memory storage mechanism to hold temporary data 
related to an ongoing conversation with the user via Telegram. It allows the agent 
to store information (like a generated blog post draft, the original topic, etc.) 
when it sends a message to the user and needs to wait for a callback or reply. 

Currently, it supports managing the context for only one active interaction at a time
using a default job ID.
"""
import logging

# Simple in-memory store for the context of the currently pending job/question.
# This supports one active job/question at a time using a default ID.
_current_job_context_store = {}

# Default identifier for the single active interaction context.
DEFAULT_JOB_ID = "active_interaction"

def store_job_context(context: dict, job_id: str = DEFAULT_JOB_ID):
    """
    Stores the provided context data for a given job ID.

    If a context already exists for this job_id, it will be overwritten.

    Args:
        context: A dictionary containing the data to store (e.g., supabase_payload, 
                 original_topic, current_title_escaped, next_action).
        job_id: The identifier for the job context. Defaults to DEFAULT_JOB_ID.
    """
    global _current_job_context_store
    _current_job_context_store[job_id] = context
    logging.info(f"Job context stored for job_id: '{job_id}'. Keys: {list(context.keys())}")

def get_job_context(job_id: str = DEFAULT_JOB_ID) -> dict | None:
    """
    Retrieves the stored context data for a given job ID.

    Args:
        job_id: The identifier for the job context. Defaults to DEFAULT_JOB_ID.

    Returns:
        A dictionary containing the job context if found, otherwise None.
    """
    global _current_job_context_store
    context = _current_job_context_store.get(job_id)
    if context:
        logging.info(f"Job context retrieved for job_id: '{job_id}'.")
    else:
        logging.warning(f"No job context found for job_id: '{job_id}'.")
    return context

def pop_job_context(job_id: str = DEFAULT_JOB_ID) -> dict | None:
    """
    Retrieves and then removes the stored context data for a given job ID.

    This is useful for ensuring a context is processed only once.

    Args:
        job_id: The identifier for the job context. Defaults to DEFAULT_JOB_ID.

    Returns:
        A dictionary containing the job context if found and removed, otherwise None.
    """
    global _current_job_context_store
    context = _current_job_context_store.pop(job_id, None)
    if context:
        logging.info(f"Job context retrieved and cleared for job_id: '{job_id}'.")
    else:
        logging.warning(f"No job context to pop for job_id: '{job_id}'.")
    return context

def clear_job_context(job_id: str = DEFAULT_JOB_ID):
    """
    Removes the stored context data for a given job_id without returning it.

    Args:
        job_id: The identifier for the job context. Defaults to DEFAULT_JOB_ID.
    """
    global _current_job_context_store
    if job_id in _current_job_context_store:
        del _current_job_context_store[job_id]
        logging.info(f"Job context cleared for job_id: '{job_id}'.")
    else:
        logging.warning(f"No job context to clear for job_id: '{job_id}'.")
