#!/usr/bin/env python3
"""Test script to verify .env file reading functionality."""

import re
from pathlib import Path


def load_env_from_file():
    """Load environment variables from ~/.openclaw/.env"""
    env_path = Path.home() / ".openclaw" / ".env"
    
    if not env_path.exists():
        print(f"❌ Error: {env_path} not found!")
        return None
    
    print(f"✅ Found .env file: {env_path}")
    
    try:
        content = env_path.read_text(encoding='utf-8')
        print(f"📄 File content:\n{content}\n")
        
        # Parse key-value pairs from both env and vars sections
        # Pattern: KEY_NAME: "value" or KEY_NAME: value
        pattern = r'(\w+)\s*:\s*"([^"]+)"'
        matches = re.findall(pattern, content)
        
        if not matches:
            print("❌ No API keys found in .env file")
            return None
        
        print(f"🔍 Found {len(matches)} key(s):")
        env_vars = {}
        for key, value in matches:
            env_vars[key] = value
            print(f"   - {key}: {value}")
        
        return env_vars
        
    except Exception as e:
        print(f"❌ Failed to parse .env file: {e}")
        return None


def test_api_key(api_name):
    """Test if a specific API key can be read."""
    env_vars = load_env_from_file()
    
    if not env_vars:
        return False
    
    if api_name in env_vars:
        print(f"\n✅ SUCCESS! Found {api_name} = '{env_vars[api_name]}'")
        return True
    else:
        print(f"\n❌ FAILED! {api_name} not found in .env")
        return False


if __name__ == "__main__":
    print("=" * 50)
    print("Testing .env File Reading for OpenClaw")
    print("=" * 50 + "\n")
    
    # Test TEST_API specifically
    success = test_api_key("TEST_API")
    
    if success:
        print("\n🎉 Environment variable reading works correctly!")
        print("   Ready to store Tavily API key securely.")
    else:
        print("\n⚠️  Need to fix .env parsing logic.")
