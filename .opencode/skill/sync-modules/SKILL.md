---
name: sync-modules
description: Sync control-center master and update submodule pointers safely.
---

## Use This Skill

Put this line near the top of any prompt when you need to pull latest changes and sync submodules:

@sync-modules

## Goal

Keep the control-center and its submodules up to date with the latest upstream changes, while preserving clean git state and avoiding destructive operations.

## Standard Flow

### 1) Sync control-center `master`

```bash
git fetch origin --prune
git pull --ff-only origin master
git submodule update --init --recursive
```

### 2) Check submodule status

```bash
git submodule status
git -C apps/openwork status
git -C apps/openwork-landing status
```

### 3) Update OpenWork submodule pointer (optional)

```bash
# Update the pinned checkout to the latest main.
git -C apps/openwork fetch origin --prune
git -C apps/openwork switch main
git -C apps/openwork pull --ff-only

# Record the new gitlink on control-center master.
git add apps/openwork
git commit -m "chore: bump openwork submodule"
git push origin master
```

### 4) Update OpenWork Landing submodule pointer (optional)

```bash
# Update the pinned checkout to the latest main.
git -C apps/openwork-landing fetch origin --prune
git -C apps/openwork-landing switch main
git -C apps/openwork-landing pull --ff-only

# Record the new gitlink on control-center master.
git add apps/openwork-landing
git commit -m "chore: bump openwork-landing submodule"
git push origin master
```

## Notes

- Never use destructive git commands (`reset --hard`, forced checkout) unless explicitly requested.
- Keep submodule pointers in control-center `master` aligned with merged submodule changes.
- If a submodule is detached, switching to its main branch is expected for syncing.
