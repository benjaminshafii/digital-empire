---
description: Write a PRD to the local filesystem
---
You are running in the digital-empire control center. Write the PRD to disk based on:

$ARGUMENTS

Requirements:
1) Create or update `prds/<slug>-prd.md`, using a kebab-case slug from $ARGUMENTS.
2) Produce a complete PRD (overview, goals, scope, out-of-scope, architecture, repo touchpoints, milestones, risks, open questions).
3) Pull in relevant findings from research docs in `research/` if present.
4) Keep the PRD actionable with clear next steps.

Output:
- Provide a short status log and the PRD file path.
