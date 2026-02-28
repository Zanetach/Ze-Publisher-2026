import { NMPSettings } from "../settings";

import { HtmlPlugin as UnifiedHtmlPlugin } from "../shared/plugin/html-plugin";

/**
 * 引用块处理插件
 * 仅保留结构，不注入固定颜色或固定视觉样式，由主题 CSS 决定最终呈现。
 */
export class Blockquotes extends UnifiedHtmlPlugin {
	getPluginName(): string {
		return "引用块处理插件";
	}

	getPluginDescription(): string {
		return "处理微信公众号中的引用块结构，样式由主题控制";
	}

	process(html: string, settings: NMPSettings): string {
		return html;
	}
}
