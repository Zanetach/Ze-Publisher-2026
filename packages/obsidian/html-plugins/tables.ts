import { NMPSettings } from "../settings";

import { HtmlPlugin as UnifiedHtmlPlugin } from "../shared/plugin/html-plugin";

/**
 * 表格处理插件 - 处理微信公众号中的表格格式
 */
export class Tables extends UnifiedHtmlPlugin {
	getPluginName(): string {
		return "表格处理插件";
	}

	getPluginDescription(): string {
		return "表格结构处理，样式由主题 CSS 决定";
	}

	process(html: string, settings: NMPSettings): string {
		return html;
	}
}
