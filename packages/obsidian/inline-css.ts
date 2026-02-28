// 需要渲染进 inline style 的基础结构样式（不包含固定主题颜色）
export default `
[data-component="admonition"] {
  padding: 1em 1.25em;
  margin: 1em 0;
  border-left: 4px solid var(--primary-color, currentColor);
  border-radius: 6px;
}

[data-element="admonition-header"] {
  display: flex;
  align-items: center;
  gap: 0.5em;
  margin-bottom: 0.5em;
}

[data-element="admonition-icon"] {
  width: 1.1em;
  height: 1.1em;
  display: inline-block;
  flex-shrink: 0;
}

[data-element="admonition-icon"] svg {
  width: 100%;
  height: 100%;
}

[data-element="admonition-content"] > *:first-child {
  margin-top: 0;
}

[data-element="admonition-content"] > *:last-child {
  margin-bottom: 0;
}

.block-math-svg {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  max-width: 300%;
}

.note-highlight {
  background-color: rgba(255, 208, 0, 0.4);
}

.zp-image-caption {
  text-align: center;
  font-size: 0.9em;
  opacity: 0.75;
  margin: 8px 0;
  font-style: italic;
  line-height: 1.5;
}

.zp-image-wrapper {
  text-align: center;
}

.zp-heading-number {
  font-weight: inherit;
}
`;
