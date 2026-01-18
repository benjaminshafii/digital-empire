---
name: submodule-dev-flow
description: Opinionated workflow for submodule development + PRs + control-center pointer bumps.
---

## Use This Skill

Put this line near the top of any prompt where you plan to ship product changes via submodules:

@submodule-dev-flow

## Goal

Enable parallel feature work across multiple submodules without Git submodule checkout collisions, while keeping control-center `master` clean.

Opinionated defaults:

- Dev happens in **submodule repo worktrees** under `worktrees/` (inside this repo).
- The pinned submodule checkout under `apps/<name>` is treated as **read-only**.
- Submodule PRs merge first; then control-center bumps submodule pointers on `master`.

## Standard Flow (Single Submodule)

### 1) Sync control-center `master`

```bash
git fetch origin --prune
git pull --ff-only origin master
```

### 2) Create a submodule worktree for the feature

Example: OpenWork.

```bash
mkdir -p worktrees

# Fetch latest refs in the submodule repo.
git -C apps/openwork fetch origin --prune

# Create a dedicated dev checkout under worktrees/.
git -C apps/openwork worktree add \
  -b feat/<name> \
  ../../worktrees/sub-openwork-<name> \
  origin/main
```

### 3) Install dependencies and run checks

Always install first, then run minimal checks:

```bash
pnpm -C worktrees/sub-openwork-<name> install
pnpm -C worktrees/sub-openwork-<name> typecheck
pnpm -C worktrees/sub-openwork-<name> build:web
```

Optional heavier tests:

```bash
pnpm -C worktrees/sub-openwork-<name> test:e2e
```

### 4) Commit + push in the submodule repo

```bash
git -C worktrees/sub-openwork-<name> status

git -C worktrees/sub-openwork-<name> add -A
git -C worktrees/sub-openwork-<name> commit -m "..."

git -C worktrees/sub-openwork-<name> push -u origin feat/<name>
```

### 5) Open PR in the submodule repo

```bash
gh pr create --repo different-ai/openwork --base main --head feat/<name>
```

Merge the PR (squash is fine).

### 6) After merge: bump the submodule pointer on control-center `master`

```bash
# Update the pinned checkout to the merged tip.
git -C apps/openwork switch main
git -C apps/openwork pull --ff-only

# Record the new gitlink on control-center master.
git add apps/openwork
git commit -m "chore: bump openwork submodule"
git push origin master
```

## Parallel Work (Multiple Features)

- Create multiple submodule worktrees under `worktrees/`:
  - `worktrees/sub-openwork-<a>`
  - `worktrees/sub-openwork-<b>`
  - `worktrees/sub-openwork-landing-<c>`

- Submodule PRs can proceed independently.
- Pointer bumps land on control-center `master` one-at-a-time as PRs merge.

## Checklist (Before You Declare Done)

- Submodule: `pnpm typecheck` + `pnpm build:web`
- Submodule PR merged
- Control-center: submodule pointer bumped on `master`
