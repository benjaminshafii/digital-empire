---
name: website-deploy
description: Deploy websites to [subdomain].benjaminshafii.com via Vercel
---

## Quick Usage (Already Configured)

### Deploy a new website

1. **Create the app** in `apps/<app-name>/`:
```bash
mkdir -p apps/<app-name>/src
```

2. **Create package.json**:
```json
{
  "name": "@digital-empire/<app-name>",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.3",
    "vite": "^6.0.1"
  }
}
```

3. **Create required files**:
- `vite.config.ts` - Vite config with React plugin
- `tsconfig.json` - TypeScript config
- `index.html` - Entry HTML
- `src/main.tsx` - React entry point
- `src/App.tsx` - Main app component

4. **Install and build**:
```bash
pnpm install
pnpm --filter @digital-empire/<app-name> build
```

5. **Switch to correct Vercel team**:
```bash
vercel switch $VERCEL_TEAM
```

6. **Deploy**:
```bash
cd apps/<app-name>
vercel --prod --yes
```

7. **Add custom domain**:
```bash
vercel domains add <subdomain>.$VERCEL_DOMAIN
```

### Result
Website will be live at: `https://<subdomain>.benjaminshafii.com`

---

## Mobile-First Template

For phone-optimized apps, use this index.html:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="theme-color" content="#0a0a0a" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <title>App Title</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Dark theme base styles:
```typescript
const styles = {
  container: {
    minHeight: '100dvh',
    backgroundColor: '#0a0a0a',
    color: '#fafafa',
    fontFamily: "'JetBrains Mono', monospace",
    padding: '24px 20px',
  },
}

// Global styles to inject
const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
  }
  html, body {
    background-color: #0a0a0a;
    overflow-x: hidden;
  }
`
```

---

## Environment Variables

Required in `.env` (gitignored):
```bash
VERCEL_TEAM=bshafiis-projects
VERCEL_DOMAIN=benjaminshafii.com
```

---

## Common Gotchas

- **Wrong Vercel team**: Always run `vercel switch $VERCEL_TEAM` before deploying to ensure domain access
- **Domain 403 error**: Means you're on the wrong team - the domain is owned by `bshafiis-projects`
- **Remove old .vercel folder**: If switching teams, delete `.vercel/` directory first
- **Number inputs on mobile**: Hide spinners with `-webkit-appearance: none` and `-moz-appearance: textfield`

---

## First-Time Setup (If Not Configured)

### 1. Check Vercel CLI is installed
```bash
which vercel
```

If not installed:
```bash
npm i -g vercel
vercel login
```

### 2. Find your team and domain
```bash
vercel teams ls
vercel domains ls
```

### 3. Create .env file
```bash
cat > .env << 'EOF'
VERCEL_TEAM=bshafiis-projects
VERCEL_DOMAIN=benjaminshafii.com
EOF
```

### 4. Verify setup
```bash
vercel switch $VERCEL_TEAM
vercel domains ls  # Should show benjaminshafii.com
```

---

## Existing Deployed Sites

| Subdomain | App | Description |
|-----------|-----|-------------|
| recipes | apps/recipes | Recipe ratio calculators (lemonade) |
