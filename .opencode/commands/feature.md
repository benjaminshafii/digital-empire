---
description: Create a feature branch, execute instructions, open PR, and monitor CI
---
You are running in the digital-empire control center. Execute this end-to-end feature flow for the user instructions below.

User instructions:
$ARGUMENTS

Requirements:
1) Create a worktree in ./worktrees starting from origin/dev (or origin/main if dev not present). This is your starting point and ensures we always start from the remote origin.
2) Installs deps & Run all work in the new worktree (never in the main repo directory).
3) Execute the user instructions exactly.
4) Create a PR when work is ready and tests pass.
5) Watch GitHub Actions checks for the PR. If all required checks pass (ensure your tool calls wait an appropriate amount of time for these actions)
6) If any check fails, attempt to fix them by adding new commits to the PR.
7) rearead everything at the end aand think about ways to simplify commit and push
8) If any check fails, attempt to fix them by adding new commits to the PR.

Output:
- Provide a short status log of each step (sync, worktree, implementation, tests, PR, checks, merge).
- End by repeating the user instructions verbatim and confirming completion.
