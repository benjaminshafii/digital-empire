# Context

## Purpose

This file is loaded at session start to keep the repo’s mission, principles, and access model in working memory.

## Always-On Principles

- Repo is OpenCode and can inspect itself.
- Skills are the primary path to self-improvement.
- Prefer atomic tools and prompt-driven workflows.
- Parity: agent can do any UI action.
- Graceful degradation: ask for missing access.
- Credentials live in Bitwarden/env/OS keychain.
- Multi-user, credentialed profiles per family member.
- Prefer standards and existing tools.

## Access Model

- Use Bitwarden as the canonical credential store.
- If access is missing, propose API connection first, then credentials.
- Keep user data out of the repo; store only references.

## Repository Governance

- Always read `MOTIVATIONS-PHILOSOPHY.md` for product intent and examples.
- Every package/app has its own `AGENTS.md` with local rules.
- Root `AGENTS.md` defines global guidance.
- Maintain a gitignored OpenCode mirror of the repo for self-inspection.

## Example Requests

- “Hey, does Benjamin work on Tuesday?”
- “Hey, add this recipe to the recipe app.”
- “Send a Telegram message to X.”
- “Download this torrent from here.”
- “Hey, how have I been performing in the last 2 weeks on my workout?”
- “Create a new app to manage my coffee.”

## Current State

- Pending tasks: none
- Last sync: unknown
