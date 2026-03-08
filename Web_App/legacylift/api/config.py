"""
LegacyLift — Configuration Manager
Persistent JSON config stored at ~/.legacylift/config.json
Manages LLM provider settings, AWS credentials, and recent projects.
"""

import json
import os
from pathlib import Path
from typing import Optional

CONFIG_DIR = Path.home() / ".legacylift"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULT_CONFIG = {
    "mode": "cloud",  # "local" or "cloud"
    "local": {
        "provider": "ollama",  # "ollama" or "lmstudio"
        "ollama_url": "http://localhost:11434",
        "ollama_model": "glm4:latest",
        "lmstudio_url": "http://localhost:1234",
        "lmstudio_model": "default",
    },
    "cloud": {
        "provider": "bedrock",
        "aws_access_key": "",
        "aws_secret_key": "",
        "aws_region": "us-east-1",
        "bedrock_model": "anthropic.claude-3-haiku-20240307-v1:0",
    },
    "recent_projects": [],
    "editor": {
        "font_size": 13,
        "tab_size": 4,
        "word_wrap": False,
        "minimap": True,
    },
}


def _ensure_dir():
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict:
    """Load config from disk, creating defaults if missing."""
    _ensure_dir()
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r") as f:
                saved = json.load(f)
            # Merge with defaults (so new keys are always present)
            merged = _deep_merge(DEFAULT_CONFIG.copy(), saved)
            return merged
        except (json.JSONDecodeError, IOError):
            pass
    # Return defaults
    save_config(DEFAULT_CONFIG)
    return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    """Write config to disk."""
    _ensure_dir()
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def update_config(updates: dict) -> dict:
    """Merge updates into existing config and save."""
    config = load_config()
    merged = _deep_merge(config, updates)
    save_config(merged)
    return merged


def add_recent_project(path: str):
    """Add a project to recent list (dedup, max 10)."""
    config = load_config()
    recents = config.get("recent_projects", [])
    # Remove if exists, add to front
    recents = [p for p in recents if p != path]
    recents.insert(0, path)
    recents = recents[:10]
    config["recent_projects"] = recents
    save_config(config)
    return config


def get_masked_config(config: dict) -> dict:
    """Return config with secrets masked for frontend display."""
    safe = json.loads(json.dumps(config))  # deep copy
    cloud = safe.get("cloud", {})
    if cloud.get("aws_access_key"):
        k = cloud["aws_access_key"]
        cloud["aws_access_key"] = k[:4] + "•" * (len(k) - 4) if len(k) > 4 else "••••"
    if cloud.get("aws_secret_key"):
        cloud["aws_secret_key"] = "••••••••"
    return safe


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base."""
    for key, val in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(val, dict):
            base[key] = _deep_merge(base[key], val)
        else:
            base[key] = val
    return base
