---
name: tavily-search
description: Advanced web search and content extraction using Tavily API. Supports intelligent search, deep webpage crawling, and content extraction. Requires Tavily API key configuration. More powerful than ddg-search with better result quality and structured data.
---

# Tavily Search & Web Crawler

Advanced web search and content extraction powered by Tavily AI. Supports intelligent search queries, deep webpage crawling, and structured content extraction.

## Installation

Install dependencies:

```bash
# Method 1: Using pip (recommended)
pip install tavily-python

# Method 2: Using python3 -m pip
python3 -m pip install tavily-python --user

# Method 3: System package manager
sudo apt-get install python3-pip
pip install tavily-python
```

**Note**: If pip is not available, you may need to install it first or use your system's Python package manager.

## Configuration

Set your Tavily API key in `~/.openclaw/.env`:

```bash
# ~/.openclaw/.env
env: {
  TAVILY_API_KEY: "tvly-your-api-key-here",
}
```

Or in the `vars` section:

```bash
vars: {
  TAVILY_API_KEY: "tvly-your-api-key-here",
}
```

Get your free API key at: https://app.tavily.com

## Features

### 🔍 Intelligent Search
- AI-powered search with query understanding
- Returns relevant results with snippets
- Automatic source diversity
- Supports search context and depth options

### 🕷️ Deep Web Crawler
- Advanced webpage extraction
- Follows links intelligently
- Extracts full content from pages
- Handles complex page structures

### ✨ Content Extraction
- Clean text extraction
- Markdown formatting support
- Removes ads and navigation
- Preserves important content

## Usage

### Search the Web

```python
search(query="your search query", 
       search_depth="advanced",  # "basic" or "advanced"
       max_results=10)
```

### Crawl a Webpage

```python
crawl(url="https://example.com",
      extract_depth="advanced")  # "basic" or "advanced"
```

### Extract Content

```python
extract(url="https://example.com",
        include_raw_markdown=True)
```

## Examples

### Basic Search

Search for information with standard depth:

```
tavily_search(query="latest AI developments 2024")
```

### Advanced Search

Deep search with more comprehensive results:

```
tavily_search(query="machine learning frameworks comparison", 
              search_depth="advanced",
              max_results=15)
```

### Crawl a Page

Extract full content from a webpage:

```
tavily_crawl(url="https://example.com/article")
```

### Research Pattern

1. **Search** — Find relevant sources
2. **Select** — Identify best URLs from results
3. **Crawl** — Extract full content from selected pages
4. **Synthesize** — Combine information for comprehensive answer

## Parameters

### Search Options

- `query` (string) — Your search query
- `search_depth` (string) — "basic" (faster) or "advanced" (thorough, ~30s)
- `max_results` (int) — Number of results (default: 10, max: 20)
- `include_answer` (bool) — Include AI-generated answer summary
- `include_raw_content` (bool) — Include full page content

### Crawl Options

- `url` (string) — Target webpage URL
- `extract_depth` (string) — "basic" or "advanced" for link following
- `include_raw_markdown` (bool) — Preserve markdown formatting

## Output Format

Search results include:

```json
{
  "query": "search query",
  "follow_up_questions": [...],
  "answer": "AI summary (if requested)",
  "results": [
    {
      "title": "Page Title",
      "url": "https://...",
      "content": "Extracted content",
      "score": 0.95,
      "raw_content": "Full HTML/text"
    }
  ],
  "images": ["image URLs"],
  "metadata": {...}
}
```

## Comparison: Tavily vs DDG Search

| Feature | Tavily | DDG Lite |
|---------|--------|----------|
| API Key | Required (free tier available) | None |
| Result Quality | Higher (AI-powered) | Standard |
| Content Extraction | Built-in | Manual web_fetch |
| Search Depth | Basic/Advanced options | Single depth |
| Rate Limits | 1000 queries/month (free) | None |
| Raw Content | Optional inclusion | Separate fetch needed |
| Speed | Faster (~3s basic, ~30s advanced) | Slower |

## Tips

- Use "basic" search_depth for quick lookups
- Use "advanced" for research and comprehensive queries
- Set include_answer=true for AI summaries
- For deep research: search → crawl top results
- Free tier: 1000 queries/month — sufficient for most use cases
- Store API key securely in config.json (not in code)

## Error Handling

Common issues:

- **Invalid API Key**: Check config.json and verify key at app.tavily.com
- **Rate Limit**: Free tier has monthly limits; upgrade if needed
- **Network Error**: Retry with exponential backoff
- **Timeout**: Advanced searches take ~30s; increase timeout if needed

## Rate Limits

Free tier:
- 1000 queries per month
- 3 requests per minute
- 5000 characters per response

Pro tier (paid):
- Higher limits available
- Priority processing
- Additional features

## License

Tavily API usage governed by Tavily's terms of service. Check https://tavily.com for details.
