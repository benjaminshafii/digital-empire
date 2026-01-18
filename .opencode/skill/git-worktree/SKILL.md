---
name: git-worktree
description: Create and manage isolated git worktrees safely.
---

## Use This Skill

Add this line to any prompt when you want to do worktree setup:

@git-worktree

## Goal

Create a new git worktree under `../worktrees/<name>` so feature work is isolated, repeatable, and easy to clean up.

This repo commonly uses worktrees for feature work. The usual pattern is:

- Control-center worktree: `../worktrees/<feature>`
- Submodule work happens inside that worktree (example: `vendor/openwork/`)

## Safety Rules

- Do not use destructive commands (`git reset --hard`, `git checkout --`, `rm -rf`) unless explicitly requested.
- Never overwrite existing worktree directories.
- Prefer `git pull --ff-only` and avoid rebases unless asked.
- Confirm the repo is clean before creating a worktree (or clearly explain what’s dirty).

## Standard Workflow (Control Center)

### 1) Confirm you are on the control-center repo

- Run `git rev-parse --show-toplevel` and ensure it matches the current repo.

### 2) Sync `master`

Run:

```bash
git fetch origin --prune
git pull --ff-only origin master
```

### 3) Create the worktree

Pick a feature name:

- Branch: `feat/<name>`
- Worktree path: `../worktrees/feat-<name>`

Then:

```bash
ls ..
ls ../worktrees

git worktree add -b feat/<name> ../worktrees/feat-<name> master
```

### 4) Initialize submodules inside the new worktree

```bash
git -C ../worktrees/feat-<name> submodule update --init --recursive
```

### 5) Submodule feature work (example: OpenWork)

Inside the new worktree:

```bash
git -C ../worktrees/feat-<name>/vendor/openwork fetch origin --prune
git -C ../worktrees/feat-<name>/vendor/openwork switch -c feat/<name> origin/main
```

Then install deps and develop:

```bash
pnpm -C ../worktrees/feat-<name>/vendor/openwork install
pnpm -C ../worktrees/feat-<name>/vendor/openwork typecheck
```

## Common Checks

- List worktrees:

```bash
git worktree list
```

- Show which worktrees exist on disk:

```bash
ls ../worktrees
```

- Verify submodule state:

```bash
git submodule status
```

## Cleanup (Non-destructive)

If you want to remove a worktree, prefer:

```bash
git worktree remove ../worktrees/feat-<name>
```

Only do this after confirming there is no uncommitted work in that worktree.
