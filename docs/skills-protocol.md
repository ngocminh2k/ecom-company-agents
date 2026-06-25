# Skills Protocol

## SKILL.md Format

Skills follow the Claude Code SKILL.md standard with ECC extensions.

### Basic Structure
```markdown
---
name: skill-name
description: What this skill does
triggers: [keyword1, keyword2]
ecc:
  mode: prototype|deck|template|design-system
  scenario: ecommerce|marketing|engineering
  design_system:
    requires: true
  inputs:
    - name: input_name
      type: string|text|select|boolean|number
      label: Human-readable label
      required: true
      options: [opt1, opt2]
  outputs:
    primary: index.html
    secondary: [file2.png]
---

## Skill Instructions
...
```

### Discovery Locations (priority order)
1. `./.claude/skills/` — project-private
2. `./skills/` — project-committed
3. `~/.claude/skills/` — user-global

### Modes
| Mode | Output | Preview |
|------|--------|---------|
| prototype | Single interactive HTML | iframe |
| deck | Multi-slide presentation | HTML + nav |
| template | Pre-built artifact | Copy-based |
| design-system | DESIGN.md preview | Design spec |

### Built-in Skills (30+)
- POD Product Designer
- Dropshipping Product Researcher
- Ad Creative Generator
- Analytics Dashboard Creator
- E-commerce SEO Optimizer
