## 1. 容器与高度链路基线

- [x] 1.1 梳理并固定 Obsidian 预览视图到 React/Shadow 的容器挂载链路，确保容器选择稳定（不依赖脆弱索引位置）。
- [x] 1.2 在 ItemView 容器、React 容器、Shadow 挂载容器统一建立 `height: 100%` + `min-height: 0` 的高度约束。
- [x] 1.3 明确父层容器仅负责布局、不承担滚动，并清理会导致内容裁切的冲突 `overflow` 配置。

## 2. 滚动交互语义收敛

- [x] 2.1 将预览展示区收敛为唯一纵向滚动容器，统一为原生连续滚动。
- [x] 2.2 移除或禁用与连续滚动冲突的分页式交互（例如上下翻页按钮/滚轮分页拦截）。
- [x] 2.3 统一滚动条可见性与样式策略，确保用户可感知并可拖拽滚动。

## 3. 主题与复杂内容回归保障

- [x] 3.1 约束主题样式覆盖边界，禁止主题覆盖滚动关键属性（`overflow`、`height`、`min-height`）。
- [ ] 3.2 验证主题切换前后滚动能力一致，且可滚动至文末。
- [ ] 3.3 验证复杂内容（Mermaid、长代码块、多图混排）场景下滚动链路不被阻塞。
- [ ] 3.4 验证工具栏显隐、左右布局切换、窗口尺寸变化后滚动能力不回归。

## 4. 验收与发布

- [ ] 4.1 使用用户提供的长文样例执行端到端手工验收并记录结果。
- [x] 4.2 完成构建与插件目录同步，确认 Obsidian 重载后行为与验收标准一致。
- [x] 4.3 补充变更说明（问题、修复范围、验证场景、已知限制）以支持后续归档。

## 5. 实施记录

- 已完成模块：
  - `packages/obsidian/note-preview-external.tsx`
  - `packages/frontend/src/components/ZePublishReact.tsx`
  - `packages/frontend/src/index.css`
  - `packages/frontend/src/main.tsx`
  - `packages/frontend/src/dev.tsx`
  - `packages/obsidian/plugin-paths.ts` 及相关路径调用方
- 已完成交付：
  - 前端与 Obsidian 包构建通过
  - 插件已同步至：
    - `/Users/zane/Documents/Personal/Knowledge/.obsidian/plugins/zepublish/`
    - `/Users/zane/Documents/Personal/Knowledge/.obsidian/plugins/.obsidian/plugins/zepublish/`
