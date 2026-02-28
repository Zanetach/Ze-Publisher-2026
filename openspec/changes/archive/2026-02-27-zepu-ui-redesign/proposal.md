## 为什么

当前 ZePublish 的功能能力已经较丰富，但界面信息架构仍以“功能清单”组织，导致用户在写作准备、样式校验与交付发布之间频繁跳转。随着功能增长（模板、插件、AI、封面、云存储等），现在需要统一 UI 与交互模型，以提升可用性、可维护性和交付效率。

## 变更内容

- 将当前界面重构为任务导向的三工作区：`Prepare`（创作准备）、`Review`（样式与预览）、`Deliver`（交付中心）。
- 建立统一的交付交互语义：`复制 / 导出 / 发布`，并引入交付状态机（ReadyToShip、Blocked、Delivering、Failed、Success）。
- 引入语义化主题令牌体系（颜色/层级/状态语义），统一浅色、深色、跟随系统下的一致体验。
- 为布局灵活性提供渐进能力：默认稳定布局、可折叠与可记忆、后续可扩展 Workspace 预设。
- 将现有“复制到平台”入口从分散位置收敛到交付中心，保留兼容期入口与迁移说明。

## 功能 (Capabilities)

### 新增功能
- `adaptive-workbench-layout`: 任务导向工作台布局与渐进式布局灵活能力。
- `semantic-theme-token-system`: 基于语义令牌的 UI 主题系统与跨模式一致性规则。
- `delivery-workflow-center`: 统一交付中心与交付状态机，收敛平台交付动作。
- `task-oriented-usability-standards`: 以任务完成为导向的主动作、反馈和错误恢复规范。

### 修改功能
- （无）

## 影响

- 受影响代码：
  - `packages/frontend/src/components/ZePublishReact.tsx`
  - `packages/frontend/src/components/toolbar/Toolbar.tsx`
  - `packages/frontend/src/components/toolbar/ArticleInfo.tsx`
  - `packages/frontend/src/components/toolbar/LogsPanel.tsx`
  - `packages/frontend/src/index.css`
  - `packages/frontend/src/store/**`
  - `packages/obsidian/note-preview-external.tsx`
- 受影响系统：
  - Obsidian 侧边视图下的主交互路径
  - 预览与交付链路（复制/导出/发布）
  - 主题切换与界面一致性
- 兼容性影响：
  - 需要提供旧入口到新工作区的过渡策略与回滚方案，避免影响既有用户操作习惯。
