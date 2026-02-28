# Ze Publisher

## 程序介绍

Ze Publisher 是一个 Obsidian 发布工作流插件。  
它将内容排版、AI 辅助操作、生图能力、实时预览与内容分发整合到同一套流程中，帮助你更高效地完成发布。

## 关键功能

- 文章内容实时渲染与预览
- AI 分析与内容操作面板
- 内容区 Mermaid 流程图渲染
- 主题与模板套装切换
- 微信公众号、X（Twitter）、知乎等分发配置
- 封面/图片生成与保存流程

## 安装方式

### 源码构建

```bash
pnpm install
pnpm build
```

构建完成后，将插件产物复制到你的 Obsidian 插件目录，并在 Obsidian 中启用。

### 本地同步（开发）

```bash
pnpm sync:plugin
```

可在 `.env.local` 中配置 Vault 路径：

```env
OBSIDIAN_VAULT_PATH=/你的Vault绝对路径
```

## License 授权

MIT

