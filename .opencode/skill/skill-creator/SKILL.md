---
name: skill-creator
description: Guide for creating effective skills. Use when users want to create or update a skill that extends Claude with specialized knowledge, workflows, or tool integrations.
license: Complete terms in LICENSE.txt
---

# Skill Creator

This skill provides guidance for creating effective skills.

## About Skills

Skills are modular, self-contained packages that extend Claude's capabilities by providing specialized knowledge, workflows, and tools. Think of them as onboarding guides for specific domains or tasks.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for complex and repetitive tasks

## Core Principles

### Concise is Key

The context window is a public good. Keep only context Claude cannot infer. Prefer concise examples over verbose explanations.

### Set Appropriate Degrees of Freedom

Match specificity to fragility and variability:

- High freedom (text-based instructions) for flexible workflows
- Medium freedom (pseudocode or scripts with parameters) for preferred patterns
- Low freedom (specific scripts, few parameters) for fragile operations

## Anatomy of a Skill

Every skill consists of a required SKILL.md file and optional bundled resources:

```
skill-name/
├── SKILL.md (required)
└── Bundled Resources (optional)
    ├── scripts/
    ├── references/
    └── assets/
```

### SKILL.md (required)

- Frontmatter (YAML) with `name` and `description`
- Body (Markdown) with instructions

### Bundled Resources (optional)

#### Scripts (`scripts/`)

Use for deterministic or repeated code.

#### References (`references/`)

Use for documentation or schemas. For large files (>10k words), include grep patterns in SKILL.md.

#### Assets (`assets/`)

Use for templates or files used in outputs.

### What to Not Include in a Skill

Do not add extra docs like README.md, INSTALLATION_GUIDE.md, or CHANGELOG.md.

## Progressive Disclosure Design

Keep SKILL.md lean and under ~500 lines. Move heavy reference material into `references/` and link to it from SKILL.md.

## Skill Creation Process

Follow these steps, skipping only when clearly not applicable.

1. Understand the skill with concrete examples
2. Plan reusable skill contents (scripts, references, assets)
3. Initialize the skill (run `scripts/init_skill.py`)
4. Edit the skill (implement resources and write SKILL.md)
5. Package the skill (run `scripts/package_skill.py`)
6. Iterate based on real usage

### Step 1: Understand With Examples

Gather concrete usage examples to define scope. Ask minimal, targeted questions.

### Step 2: Plan Reusable Contents

Identify scripts, references, and assets that prevent repeated work.

### Step 3: Initialize the Skill

```bash
scripts/init_skill.py <skill-name> --path <output-directory>
```

### Step 4: Edit the Skill

- Use imperative/infinitive form in SKILL.md.
- Include only essential guidance and procedural knowledge.
- Remove unused example files from init.

#### Frontmatter

Only include `name` and `description` (plus optional `license`, `compatibility`, `metadata`).

#### Body

Write concise instructions and link to references as needed.

### Step 5: Package the Skill

```bash
scripts/package_skill.py <path/to/skill-folder>
```

### Step 6: Iterate

Use, observe friction, update SKILL.md/resources, test again.

## OpenCode Conventions

Use OpenCode skill discovery and naming rules:

- Place skills at `.opencode/skill/<name>/SKILL.md`.
- `name` must match the folder name and follow `^[a-z0-9]+(-[a-z0-9]+)*$`.
- `description` must be 1-1024 characters.
- Use `skill` tool to load skills.
- Configure skill permissions in `opencode.json` if needed.
