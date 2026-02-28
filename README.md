# Ze Publisher

Ze Publisher is an Obsidian plugin for content editing, AI analysis, theme styling, image generation, and multi-platform distribution.

Current release target: `0.25`

## Key Features

- Real-time article preview and style rendering
- AI analysis action button with selectable analysis type
- Stable Mermaid rendering in content area (with fallback normalization)
- Content distribution settings for WeChat, X (Twitter), Zhihu
- Cover/image generation workflow
- Theme and template kit management
- Dark/light UI adaptation

## Plugin IDs

This project currently supports both IDs for compatibility:

- New ID: `ze-publisher`
- Legacy ID: `zepublish`

If your vault still enables `zepublish`, the latest build can still run through compatibility handling.

## Install (Manual)

1. Build from source:

```bash
pnpm install
pnpm build
```

2. Copy plugin build output to your vault plugin folder:

- Preferred: `.obsidian/plugins/ze-publisher`
- Compatible: `.obsidian/plugins/zepublish`

## Development

```bash
pnpm dev
pnpm check
pnpm sync:plugin
```

`sync:plugin` uses `.env.local`:

```env
OBSIDIAN_VAULT_PATH=/absolute/path/to/your/vault
```

## Distribution Platforms

- WeChat Official Account
- X (Twitter)
- Zhihu

Each platform can be enabled and configured independently in content distribution settings.

## Versioning

Version is synchronized across:

- Root `package.json`
- `packages/obsidian/manifest.json`
- `packages/obsidian/package.json`
- `packages/frontend/package.json`

## Author

Author: `Zanetach`

