## 为什么

当前插件在主题切换后可以正确渲染样式，但对长文内容的展示能力不稳定：内容区经常只显示一部分，无法持续上下滚动到底。这直接影响核心使用场景（长文预览与复制前检查），需要作为独立能力明确约束并修复。

## 变更内容

- 定义并落实“长文可滚动预览”能力，确保展示区在长内容场景下始终可完整上下浏览。
- 统一预览区滚动行为为原生纵向滚动（鼠标滚轮/触控板/滚动条拖拽），移除或避免与分页式交互冲突。
- 约束主题切换、工具栏显隐、Shadow DOM 挂载等场景下的布局链路，保证滚动能力不被破坏。
- 增加针对长文、图片、代码块、Mermaid 等内容组合场景的回归验证要求。

## 功能 (Capabilities)

### 新增功能

- `long-content-scrollable-preview`: 预览展示区支持长文稳定上下滚动，且在主题切换与布局变化后仍保持可滚动与可达底部。

### 修改功能

- 无

## 影响

- 受影响模块：
  - `packages/obsidian/note-preview-external.tsx`（预览容器构建、挂载与高度链路）
  - `packages/frontend/src/components/ZePublishReact.tsx`（展示区布局与滚动容器）
  - `packages/frontend/src/index.css`（滚动容器与滚动条样式规则）
  - `packages/frontend/src/main.tsx` / `packages/frontend/src/dev.tsx`（Shadow 挂载容器样式基线）
- 受影响行为：
  - 主题切换后的展示区可滚动性
  - 长文内容完整可见性
  - 预览区交互一致性（滚轮、滚动条、触控板）
