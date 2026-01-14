---
name: plugin-logging
description: Use client.app.log() instead of console.log in OpenCode plugins
---

# OpenCode Plugin Logging

## Rule

Use `client.app.log()` for structured logs inside OpenCode plugins. Do not use `console.log()`.

Why:
- Logs show up consistently in OpenCode’s log stream
- Logs are structured (filterable by `service` / `level`)

## Example

```ts
export const MyPlugin = async ({ client }) => {
  await client.app.log({
    service: "my-plugin",
    level: "info",
    message: "Plugin initialized",
    extra: { foo: "bar" },
  });
};
```

## Tool Handlers

Inside `tool({ ... async execute(args, ctx) { ... } })`, prefer:

```ts
await ctx.client.app.log({
  service: "my-plugin",
  level: "info",
  message: "did thing",
  extra: { args },
});
```

If you’re not sure `ctx.client.app.log` exists (older plugin API), use a guarded call:

```ts
if (ctx?.client?.app?.log) {
  await ctx.client.app.log({ service: "my-plugin", level: "info", message: "..." });
}
```
