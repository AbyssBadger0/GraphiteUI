#!/usr/bin/env python3
"""
Tavily Web Search Skill for OpenClaw

Provides intelligent web search and content extraction using Tavily API.
"""

import json
import sys
from pathlib import Path
from tavily import TavilyClient


def load_config():
    """Load API key from ~/.openclaw/.env file."""
    env_path = Path.home() / ".openclaw" / ".env"
    
    if not env_path.exists():
        print(f"Warning: {env_path} not found. Please create it with your API keys.")
        return None
    
    try:
        # Read .env file content
        content = env_path.read_text(encoding='utf-8')
        
        # Parse the simple key-value format
        # Look for TAVILY_API_KEY in both env and vars sections
        import re
        
        # Pattern to match: TAVILY_API_KEY: "tvly-..."
        pattern = r'TAVILY_API_KEY\s*:\s*"([^"]+)"'
        match = re.search(pattern, content)
        
        if match:
            return match.group(1)
        
        # Also try tavilyApiKey format for backward compatibility
        pattern2 = r'tavilyApiKey\s*:\s*"([^"]+)"'
        match2 = re.search(pattern2, content)
        if match2:
            return match2.group(1)
            
    except Exception as e:
        print(f"Warning: Failed to parse .env file: {e}")
    
    return None


def search(query: str, search_depth: str = "basic", max_results: int = 10, 
           include_answer: bool = True, include_raw_content: bool = False):
    """
    Perform intelligent web search using Tavily.
    
    Args:
        query: Search query string
        search_depth: "basic" (fast) or "advanced" (thorough, ~30s)
        max_results: Number of results (default: 10, max: 20)
        include_answer: Include AI-generated answer summary
        include_raw_content: Include full page content in results
    
    Returns:
        JSON string with search results
    """
    api_key = load_config()
    client = TavilyClient(api_key=api_key)
    
    try:
        response = client.search(
            query=query,
            search_depth=search_depth,
            max_results=min(max_results, 20),
            include_answer=include_answer,
            include_raw_content=include_raw_content,
            include_images=False,  # Can be enabled if needed
            include_domains=None,  # Whitelist of domains
            exclude_domains=None,  # Blacklist of domains
        )
        
        return json.dumps(response, indent=2, ensure_ascii=False)
    
    except Exception as e:
        error_response = {
            "error": str(e),
            "query": query,
            "status": "failed"
        }
        return json.dumps(error_response, indent=2, ensure_ascii=False)


def crawl(url: str, extract_depth: str = "advanced"):
    """
    Crawl and extract content from a webpage.
    
    Args:
        url: Target webpage URL
        extract_depth: "basic" or "advanced" for link following
    
    Returns:
        JSON string with crawled content
    """
    api_key = load_config()
    client = TavilyClient(api_key=api_key)
    
    try:
        response = client.crawl(
            url=url,
            max_depth=int(extract_depth == "advanced" and 3 or 1),
            include_raw_markdown=True,
        )
        
        return json.dumps(response, indent=2, ensure_ascii=False)
    
    except Exception as e:
        error_response = {
            "error": str(e),
            "url": url,
            "status": "failed"
        }
        return json.dumps(error_response, indent=2, ensure_ascii=False)


def extract(url: str, include_raw_markdown: bool = True):
    """
    Extract clean content from a single webpage.
    
    Args:
        url: Target webpage URL
        include_raw_markdown: Preserve markdown formatting
    
    Returns:
        JSON string with extracted content
    """
    api_key = load_config()
    client = TavilyClient(api_key=api_key)
    
    try:
        response = client.extract(
            urls=[url],
            include_raw_markdown=include_raw_markdown,
        )
        
        return json.dumps(response, indent=2, ensure_ascii=False)
    
    except Exception as e:
        error_response = {
            "error": str(e),
            "url": url,
            "status": "failed"
        }
        return json.dumps(error_response, indent=2, ensure_ascii=False)


def main():
    """Main entry point for CLI usage."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  tavily-search.py search <query> [options]")
        print("  tavily-search.py crawl <url> [options]")
        print("  tavily-search.py extract <url> [options]")
        print()
        print("Options:")
        print("  --depth <basic|advanced>  Search/crawl depth (default: basic for search, advanced for crawl)")
        print("  --max-results <n>         Max results for search (default: 10)")
        print("  --no-answer               Exclude AI answer summary")
        print("  --raw-content             Include raw page content")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "search":
        if len(sys.argv) < 3:
            print("Error: Search query required")
            sys.exit(1)
        
        query = sys.argv[2]
        search_depth = "advanced" if "--depth=advanced" in sys.argv else "basic"
        max_results = int(next((arg.split("=")[1] for arg in sys.argv if arg.startswith("--max-results=")), 10))
        include_answer = "--no-answer" not in sys.argv
        include_raw = "--raw-content" in sys.argv
        
        result = search(query, search_depth, max_results, include_answer, include_raw)
        print(result)
    
    elif command == "crawl":
        if len(sys.argv) < 3:
            print("Error: URL required for crawl")
            sys.exit(1)
        
        url = sys.argv[2]
        extract_depth = "advanced" if "--depth=advanced" in sys.argv else "basic"
        
        result = crawl(url, extract_depth)
        print(result)
    
    elif command == "extract":
        if len(sys.argv) < 3:
            print("Error: URL required for extract")
            sys.exit(1)
        
        url = sys.argv[2]
        include_markdown = "--markdown" in sys.argv
        
        result = extract(url, include_markdown)
        print(result)
    
    else:
        print(f"Error: Unknown command '{command}'")
        print("Valid commands: search, crawl, extract")
        sys.exit(1)


if __name__ == "__main__":
    main()
