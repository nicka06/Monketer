# Emailore WOW Maker - AI-Powered Content Platform

Welcome to Emailore WOW Maker! This project integrates an AI-driven email template editor with an autonomous AI agent for blog content generation.

## Core Components

### 1. AI Email Editor (React Frontend)

*   **Purpose**: Provides an AI-assisted interface for designing and customizing HTML email templates.
*   **Key Technologies**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Auth, Database, Edge Functions).
*   **Setup & Running**:
    1.  Ensure Node.js and npm are installed.
    2.  Install dependencies: `npm install`
    3.  Configure Supabase: Set up a Supabase project, create a `.env` file in the root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, and deploy Edge Functions from `src/backend/functions/`.
    4.  Run development server: `npm run dev`

### 2. Autonomous AI Blog Agent (Python Backend)

*   **Purpose**: Autonomously generates blog content, from news sourcing to publication, with a Telegram-based approval workflow.
*   **Key Technologies**: Python, Langchain, OpenAI API, Perplexity API, Telegram Bot API, Supabase.
*   **Detailed Information**: For full setup, configuration, and usage instructions, please see the dedicated [AI Blog Agent README](./ai_blog_agent/README.md).

## Prerequisites

*   Node.js and npm (for the frontend)
*   Python 3.x and pip (for the AI Blog Agent)
*   Supabase Account & API keys (OpenAI, Perplexity, Telegram Bot Token)
*   Git

## High-Level Directory Structure

-   `./` (Root)
    -   `src/`: Frontend React application and Supabase Edge Functions.
    -   `ai_blog_agent/`: Python AI Blog Agent (includes its own `README.md`).
    -   `supabase/`: Supabase CLI configuration.

## Getting Started

1.  **Clone the repository.**
2.  **Set up Supabase**: Create your project, configure tables, and deploy Edge Functions.
3.  **Configure Frontend**: Create `.env` with Supabase keys in the root and run `npm install` then `npm run dev`.
4.  **Configure AI Blog Agent**: Navigate to `ai_blog_agent/`, create a venv, `pip install -r requirements.txt`, create `.env` with API keys and Supabase function URL, then run `python3 main.py`. Refer to `ai_blog_agent/README.md` for details.
