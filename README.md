# Ze Publisher

## Introduction

Ze Publisher is an Obsidian publishing workflow plugin.  
It helps you format content, run AI-assisted operations, generate images, preview results in real time, and distribute content to external platforms in a unified workflow.

## Key Features

- Real-time article rendering and preview
- AI analysis and content operation panel
- Mermaid diagram rendering in content area
- Theme and template kit switching
- Content distribution settings for platforms such as WeChat, X (Twitter), and Zhihu
- Cover/image generation and save workflow

## Installation

### From source

```bash
pnpm install
pnpm build
```

Then copy the built plugin output to your Obsidian vault plugin folder and enable it in Obsidian.

### Local sync (development)

```bash
pnpm sync:plugin
```

You can set the vault path in `.env.local`:

```env
OBSIDIAN_VAULT_PATH=/absolute/path/to/your/vault
```

## License

MIT

