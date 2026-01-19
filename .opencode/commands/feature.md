---
description: Create a feature branch, execute instructions, open PR, and monitor CI
---
You are running in the digital-empire control center. Execute this end-to-end feature flow for the user instructions below.

User instructions:
$ARGUMENTS

Requirements:
1) Create a woktree in ./wortrees starting from origin/dev (or origin/main if dev notpresent) (that is your starting point this assure we always start from remote origin)
2) Installs deps & Run all work in the new worktree (never in the main repo directory).
3) Execute the user instructions exactly.
4) Create a PR when work is ready and tests pass.
5) Watch GitHub Actions checks for the PR. If all required checks pass, merge the PR.(asure your tool calls wait approriate amount of thime for these actions)
6) If any check fails, report the failure and ask the user before retrying.

Output:
- Provide a short status log of each step (sync, worktree, implementation, tests, PR, checks, merge).
- End by repeating the user instructions verbatim and confirming completion.
