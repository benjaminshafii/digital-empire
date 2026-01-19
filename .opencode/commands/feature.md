---
description: Create a feature branch, execute instructions, open PR, and monitor CI
---
You are running in the digital-empire control center. Execute this end-to-end feature flow for the user instructions below.

User instructions:
$ARGUMENTS

Requirements:
1) Ensure origin/main is up to date and clean before starting. If not clean, stop and ask the user to resolve.
2) Create a new worktree from origin/main under ../worktrees/ with a short, slugified name derived from the instructions.
3) Run all work in the new worktree (never in the main repo directory).
4) Follow the repo's submodule-dev-flow if the work touches submodules.
5) Execute the user instructions exactly.
6) Create a PR when work is ready and tests pass.
7) Watch GitHub Actions checks for the PR. If all required checks pass, merge the PR.
8) If any check fails, report the failure and ask the user before retrying.

Output:
- Provide a short status log of each step (sync, worktree, implementation, tests, PR, checks, merge).
- End by repeating the user instructions verbatim and confirming completion.
