# Plugins Specification

## Overview

A Plugin is the shippable unit of distribution. It wraps one or more skills with
a design system, pipeline stages, and metadata.

## Structure
```
my-plugin/
├── SKILL.md            — portability
├── open-design.json    — ECC manifest
└── preview/            — card assets
```

## Manifest (open-design.json)
```json
{
  "name": "plugin-name",
  "title": "Plugin Title",
  "version": "1.0.0",
  "description": "...",
  "pipeline": {
    "stages": [
      { "id": "discovery", "atoms": ["discovery-form"] },
      { "id": "generate", "atoms": ["file-write"] },
      { "id": "critique", "atoms": ["critique-theater"],
        "repeat": true, "until": "score >= 4" }
    ]
  }
}
```

## Trust Model
| Source | Trust Level | Capabilities |
|--------|-------------|-------------|
| `_official/` | trusted | Full access |
| Community | restricted | No MCP/subprocess/network without grant |

## Installation
```bash
ecc plugin install ./path
ecc plugin install github:owner/repo
ecc plugin install <registry-name>
```
