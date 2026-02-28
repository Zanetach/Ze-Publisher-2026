import {
	App,
	Notice,
	PluginSettingTab,
	requestUrl,
	Setting,
} from "obsidian";
import ZePublishPlugin from "./main";
import { cleanMathCache } from "./markdown-plugins/math";
import { LinkDescriptionMode, NMPSettings } from "./settings";
import TemplateManager from "./template-manager";
import { PlatformType } from "./types";
import { wxGetToken } from "./weixin-api";
import { xVerifyCredentials } from "./x-api";

import { logger } from "../shared/src/logger";

export class ZePublishSettingTab extends PluginSettingTab {
	plugin: ZePublishPlugin;
	settings: NMPSettings;

	constructor(app: App, plugin: ZePublishPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.settings = NMPSettings.getInstance();
	}

	private applyThemeAwareSelectStyle(selectEl: HTMLSelectElement) {
		selectEl.style.backgroundColor = "var(--background-primary)";
		selectEl.style.color = "var(--text-normal)";
		selectEl.style.borderColor = "var(--background-modifier-border)";
	}

	private formatThemeOptionLabel(name: string, className: string): string {
		const raw = (name || className || "").trim();
		const withoutPrefix = raw
			.replace(/^MP\s*Publisher\s*/i, "")
			.replace(/^MP\s*Pub\s*/i, "")
			.trim();
		const zh = withoutPrefix.match(/[\u4e00-\u9fa5]+/g)?.join(" ").trim();
		if (zh) return zh;
		return withoutPrefix || className;
	}

	async display() {
		const { containerEl } = this;

		containerEl.empty();
		// 强制后台配置页交互色走中性主题色，避免出现紫色等杂色
		containerEl.style.setProperty(
			"--interactive-accent",
			"var(--background-modifier-hover)",
		);
		containerEl.style.setProperty(
			"--interactive-accent-hover",
			"var(--background-modifier-border)",
		);
		containerEl.style.setProperty("--interactive-accent-rgb", "128,128,128");
		const templateManager = TemplateManager.getInstance();
		const kits = await templateManager.getAvailableKits();
		const kitThemes = Array.from(
			new Set(
				kits
					.map((k) => k.styleConfig?.theme)
					.filter((t): t is string => Boolean(t)),
			),
		);
		new Setting(containerEl)
			.setName("默认样式")
			.setDesc("仅显示模板套装中实际使用的样式")
			.addDropdown((dropdown) => {
				this.applyThemeAwareSelectStyle(dropdown.selectEl);
				const themeNameMap = new Map(
					this.plugin.assetsManager.themes.map((t) => [
						t.className,
						t.name || t.className,
					]),
				);
				if (kitThemes.length === 0) {
					const fallback = this.settings.defaultStyle || "mweb-default";
					const fallbackName =
						themeNameMap.get(fallback) || fallback;
					dropdown.addOption(
						fallback,
						this.formatThemeOptionLabel(fallbackName, fallback),
					);
					dropdown.setValue(fallback);
				} else {
					kitThemes.forEach((themeClass) => {
						const themeName =
							themeNameMap.get(themeClass) || themeClass;
						dropdown.addOption(
							themeClass,
							this.formatThemeOptionLabel(themeName, themeClass),
						);
					});
					if (!kitThemes.includes(this.settings.defaultStyle)) {
						this.settings.defaultStyle = kitThemes[0];
						void this.plugin.saveSettings();
					}
					dropdown.setValue(this.settings.defaultStyle);
				}
				dropdown.onChange(async (value) => {
					this.settings.defaultStyle = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setName("代码高亮").addDropdown((dropdown) => {
			this.applyThemeAwareSelectStyle(dropdown.selectEl);
			const styles = this.plugin.assetsManager.highlights;
			for (let s of styles) {
				dropdown.addOption(s.name, s.name);
			}
			dropdown.setValue(this.settings.defaultHighlight);
			dropdown.onChange(async (value) => {
				this.settings.defaultHighlight = value;
				await this.plugin.saveSettings();
			});
		});

		new Setting(containerEl)
			.setName("在工具栏展示样式选择")
			.setDesc("建议在移动端关闭，可以增大文章预览区域")
			.addToggle((toggle) => {
				toggle.setValue(this.settings.showStyleUI);
				toggle.onChange(async (value) => {
					this.settings.showStyleUI = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("脚注链接描述模式")
			.setDesc("控制脚注中链接的展示形式")
			.addDropdown((dropdown) => {
				this.applyThemeAwareSelectStyle(dropdown.selectEl);
				dropdown.addOption("empty", "仅显示链接");
				dropdown.addOption("raw", "显示链接文本和链接");
				dropdown.setValue(this.settings.linkDescriptionMode);
				dropdown.onChange(async (value) => {
					this.settings.linkDescriptionMode =
						value as LinkDescriptionMode;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("文件嵌入展示样式")
			.addDropdown((dropdown) => {
				this.applyThemeAwareSelectStyle(dropdown.selectEl);
				dropdown.addOption("quote", "引用");
				dropdown.addOption("content", "正文");
				dropdown.setValue(this.settings.embedStyle);
				dropdown.onChange(async (value) => {
					this.settings.embedStyle = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("数学公式语法")
			.addDropdown((dropdown) => {
				this.applyThemeAwareSelectStyle(dropdown.selectEl);
				dropdown.addOption("latex", "latex");
				dropdown.addOption("asciimath", "asciimath");
				dropdown.setValue(this.settings.math);
				dropdown.onChange(async (value) => {
					this.settings.math = value;
					cleanMathCache();
					await this.plugin.saveSettings();
				});
				});

		const CODE_BLOCK_PLUGIN_NAME = "代码块处理插件";
		const syncLineNumberToCodeBlockPlugin = (enabled: boolean) => {
			if (!this.settings.pluginsConfig) {
				this.settings.pluginsConfig = {};
			}
			const current =
				(this.settings.pluginsConfig[CODE_BLOCK_PLUGIN_NAME] as Record<
					string,
					unknown
				>) || {};
			this.settings.pluginsConfig[CODE_BLOCK_PLUGIN_NAME] = {
				...current,
				showLineNumbers: enabled,
			};
		};
		const pluginLineNumberConfig = this.settings.pluginsConfig?.[
			CODE_BLOCK_PLUGIN_NAME
		] as Record<string, unknown> | undefined;
		const effectiveLineNumber =
			typeof pluginLineNumberConfig?.showLineNumbers === "boolean"
				? Boolean(pluginLineNumberConfig.showLineNumbers)
				: Boolean(this.settings.lineNumber);
		// 首次兜底同步，确保后台开关与实际代码块插件配置一致
		syncLineNumberToCodeBlockPlugin(effectiveLineNumber);
		this.settings.lineNumber = effectiveLineNumber;

		new Setting(containerEl).setName("显示代码行号").addToggle((toggle) => {
			toggle.setValue(effectiveLineNumber);
			toggle.onChange(async (value) => {
				this.settings.lineNumber = value;
				syncLineNumberToCodeBlockPlugin(value);
				await this.plugin.saveSettings();
			});
		});

		new Setting(containerEl)
			.setName("启用微信代码格式化")
			.setDesc("输出符合微信公众号编辑器格式的代码块")
			.addToggle((toggle) => {
				toggle.setValue(this.settings.enableWeixinCodeFormat);
				toggle.onChange(async (value) => {
					this.settings.enableWeixinCodeFormat = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("获取更多主题")
			.setDesc("默认地址下载已关闭，请使用下方“在线下载主题”")
			.addButton((button) => {
				button.setButtonText("已关闭");
				button.setDisabled(true);
				button.onClick(async () => {
					await this.plugin.assetsManager.downloadThemes();
				});
			})
			.addButton((button) => {
				button.setIcon("folder-open");
				button.onClick(async () => {
					await this.plugin.assetsManager.openAssets();
				});
			});

		let onlineThemeUrl = "";
		new Setting(containerEl)
			.setName("在线下载主题")
			.setDesc("输入主题链接（支持 zip 主题包或 css 文件链接）")
			.addText((text) => {
				text.setPlaceholder("https://example.com/theme.zip")
					.setValue("")
					.onChange((value) => {
						onlineThemeUrl = value;
					});
				text.inputEl.style.width = "360px";
			})
			.addButton((button) => {
				button.setButtonText("从链接导入").onClick(async () => {
					await this.plugin.assetsManager.downloadThemesFromUrl(
						onlineThemeUrl,
					);
					this.display();
				});
			});

		new Setting(containerEl).setName("清空主题").addButton((button) => {
			button.setButtonText("清空");
			button.onClick(async () => {
				await this.plugin.assetsManager.removeThemes();
				this.settings.resetStyelAndHighlight();
				await this.plugin.saveSettings();
			});
		});

		new Setting(containerEl)
			.setName("CSS代码片段")
			.addToggle((toggle) => {
				toggle.setValue(this.settings.useCustomCss);
				toggle.onChange(async (value) => {
					this.settings.useCustomCss = value;
					await this.plugin.saveSettings();
				});
			})
			.addButton((button) => {
				button.setIcon("refresh-ccw");
				button.onClick(async () => {
					await this.plugin.assetsManager.loadCustomCSS();
					new Notice("刷新成功");
				});
			})
			.addButton((button) => {
				button.setIcon("folder-open");
				button.onClick(async () => {
					await this.plugin.assetsManager.openAssets();
				});
			});

		containerEl.createEl("h2", { text: "作者默认信息" });
		new Setting(containerEl)
			.setName("启用默认作者资料")
			.setDesc("当文章未填写作者时，使用这里的默认作者名称")
			.addToggle((toggle) => {
				toggle.setValue(this.settings.enableDefaultAuthorProfile);
				toggle.onChange(async (value) => {
					this.settings.enableDefaultAuthorProfile = value;
					await this.plugin.saveSettings();
				});
			});
		new Setting(containerEl)
			.setName("默认作者名称")
			.addText((text) => {
				text.setValue(this.settings.defaultAuthorName || "")
					.setPlaceholder("例如：你的品牌名 / 作者名")
					.onChange(async (value) => {
						this.settings.defaultAuthorName = value.trim();
						await this.plugin.saveSettings();
					});
				text.inputEl.style.width = "300px";
			});
		new Setting(containerEl)
			.setName("默认作者图片")
			.setDesc("上传后会在内容末尾展示，自动适应内容宽度")
			.addButton((button) => {
				button.setButtonText(
					this.settings.defaultAuthorImageData ? "重新上传" : "上传图片",
				);
				button.onClick(() => {
					const picker = document.createElement("input");
					picker.type = "file";
					picker.accept = "image/*";
					picker.onchange = async () => {
						const file = picker.files?.[0];
						if (!file) return;
						const reader = new FileReader();
						reader.onload = async () => {
							this.settings.defaultAuthorImageData = String(
								reader.result || "",
							);
							await this.plugin.saveSettings();
							new Notice("默认作者图片已保存");
							this.display();
						};
						reader.readAsDataURL(file);
					};
					picker.click();
				});
			})
			.addButton((button) => {
				button.setButtonText("清空图片");
				button.setDisabled(!this.settings.defaultAuthorImageData);
				button.onClick(async () => {
					this.settings.defaultAuthorImageData = "";
					await this.plugin.saveSettings();
					new Notice("已清空默认作者图片");
					this.display();
				});
			});

		// 模板设置暂时移除（按需求：当前先不使用）

		// === 内容分发设置 ===
		containerEl.createEl("h2", { text: "内容分发设置" });
		containerEl.createEl("p", {
			text: "配置各平台的认证信息，以便将内容分发到对应平台。",
			cls: "setting-item-description",
		});

		const distributionConfig = this.settings.distributionConfig || {};
		if (!this.settings.distributionConfig) {
			this.settings.distributionConfig = {};
		}
		const applyThemeButtonStyle = (
			btn: HTMLButtonElement,
			mode: "default" | "active" | "danger" = "default",
		) => {
			btn.style.border = "1px solid var(--background-modifier-border)";
			btn.style.borderRadius = "6px";
			btn.style.padding = "6px 10px";
			btn.style.boxShadow = "none";
			btn.style.cursor = "pointer";
			if (mode === "active") {
				btn.style.backgroundColor = "var(--background-modifier-hover)";
				btn.style.color = "var(--text-normal)";
				btn.style.borderColor = "var(--background-modifier-border)";
			} else if (mode === "danger") {
				btn.style.backgroundColor = "var(--background-secondary)";
				btn.style.color = "var(--text-muted)";
				btn.style.borderColor = "var(--background-modifier-border)";
			} else {
				btn.style.backgroundColor = "var(--background-secondary)";
				btn.style.color = "var(--text-normal)";
			}
		};
		const getPlatformStatus = (platform: PlatformType): string => {
			const cfg = distributionConfig[platform] || {};
			if (!cfg.enabled) return "未开启";
			if (platform === PlatformType.WECHAT) {
				return (this.settings.wxInfo || []).length > 0
					? "已配置并开启"
					: "已开启（待配置）";
			}
			if (platform === PlatformType.TWITTER) {
				return cfg.apiKey &&
					cfg.apiSecret &&
					cfg.accessToken &&
					cfg.accessTokenSecret
					? "已配置并开启"
					: "已开启（待配置）";
			}
			if (platform === PlatformType.ZHIHU) {
				return cfg.cookie ? "已配置并开启" : "已开启（待配置）";
			}
			return "未开启";
		};

		const platformTabs = containerEl.createDiv();
		platformTabs.style.display = "flex";
		platformTabs.style.gap = "8px";
		platformTabs.style.marginBottom = "12px";
		platformTabs.style.flexWrap = "wrap";

		const panelWrap = containerEl.createDiv();

		let activePlatform: PlatformType = PlatformType.WECHAT;
		const platformExpanded: Partial<Record<PlatformType, boolean>> = {
			[PlatformType.WECHAT]: false,
			[PlatformType.TWITTER]: false,
			[PlatformType.ZHIHU]: false,
		};
		const isWechatConfigured = () =>
			(this.settings.wxInfo || []).some(
				(r) => !!r?.name && !!r?.appid && !!r?.secret,
			);
		const isXConfigured = () => {
			const x = this.settings.distributionConfig?.[PlatformType.TWITTER] || {};
			return !!(
				x.apiKey &&
				x.apiSecret &&
				x.accessToken &&
				x.accessTokenSecret
			);
		};
		const isZhihuConfigured = () => {
			const z = this.settings.distributionConfig?.[PlatformType.ZHIHU] || {};
			return !!z.cookie;
		};
		platformExpanded[PlatformType.WECHAT] = !!distributionConfig[PlatformType.WECHAT]?.enabled && !isWechatConfigured();
		platformExpanded[PlatformType.TWITTER] = !!distributionConfig[PlatformType.TWITTER]?.enabled && !isXConfigured();
		platformExpanded[PlatformType.ZHIHU] = !!distributionConfig[PlatformType.ZHIHU]?.enabled && !isZhihuConfigured();

		const renderPlatforms = () => {
			platformTabs.empty();
			panelWrap.empty();

				const createTab = (platform: PlatformType, label: string) => {
					const btn = platformTabs.createEl("button", {
						text: `${label} · ${getPlatformStatus(platform)}`,
					});
					applyThemeButtonStyle(
						btn,
						activePlatform === platform ? "active" : "default",
					);
					btn.addEventListener("click", () => {
						activePlatform = platform;
						renderPlatforms();
					});
				};

			createTab(PlatformType.WECHAT, "微信公众号");
			createTab(PlatformType.TWITTER, "X (Twitter)");
			createTab(PlatformType.ZHIHU, "知乎");

			if (activePlatform === PlatformType.WECHAT) {
				renderWechatPanel(panelWrap, distributionConfig, async () => {
					await this.plugin.saveSettings();
					renderPlatforms();
				});
			} else if (activePlatform === PlatformType.TWITTER) {
				renderXPanel(panelWrap, distributionConfig, async () => {
					await this.plugin.saveSettings();
					renderPlatforms();
				});
			} else if (activePlatform === PlatformType.ZHIHU) {
				renderZhihuPanel(panelWrap, distributionConfig, async () => {
					await this.plugin.saveSettings();
					renderPlatforms();
				});
			}
		};

		const renderWechatPanel = (
			parent: HTMLDivElement,
			config: any,
			onPersist: () => Promise<void>,
		) => {
			const section = parent.createDiv();
			section.style.border = "1px solid var(--background-modifier-border)";
			section.style.borderRadius = "10px";
			section.style.padding = "10px";

			let wxEnabled = config[PlatformType.WECHAT]?.enabled || false;
			let wxRows = Array.isArray(this.settings.wxInfo)
				? [...this.settings.wxInfo]
				: [];
			let expanded = !!platformExpanded[PlatformType.WECHAT];

			const persist = async () => {
				if (!config[PlatformType.WECHAT]) {
					config[PlatformType.WECHAT] = {};
				}
				config[PlatformType.WECHAT].enabled = wxEnabled;
				this.settings.distributionConfig = config;
				this.settings.wxInfo = wxRows;
				await onPersist();
			};

			const header = new Setting(section)
				.setName("微信公众号")
				.setDesc("开启后配置参数，保存并开启后自动折叠")
				.addToggle((toggle) => {
					toggle.setValue(wxEnabled);
					toggle.onChange(async (v) => {
						wxEnabled = v;
						expanded = v;
						platformExpanded[PlatformType.WECHAT] = expanded;
						await persist();
						renderPlatforms();
					});
				});
			header.controlEl.style.cursor = "pointer";
			header.controlEl.addEventListener("click", (e) => {
				if ((e.target as HTMLElement).closest(".checkbox-container")) {
					return;
				}
				expanded = !expanded;
				platformExpanded[PlatformType.WECHAT] = expanded;
				renderPlatforms();
			});

			const body = section.createDiv();
			body.style.display = wxEnabled && expanded ? "" : "none";
			if (wxRows.length === 0) wxRows.push({ name: "", appid: "", secret: "" });

			const savedRows = wxRows.filter((r) => r.name && r.appid && r.secret);
			if (savedRows.length > 0) {
				const savedList = section.createDiv();
				savedList.style.margin = "8px 0";
				savedList.createEl("div", {
					text: "已保存记录",
					cls: "setting-item-description",
				});
				const listWrap = savedList.createDiv();
				listWrap.style.display = "flex";
				listWrap.style.gap = "8px";
				listWrap.style.flexWrap = "wrap";
				savedRows.forEach((row) => {
					const itemBtn = listWrap.createEl("button", {
						text: row.name,
					});
					applyThemeButtonStyle(itemBtn, "default");
					itemBtn.addEventListener("click", () => {
						expanded = true;
						platformExpanded[PlatformType.WECHAT] = true;
						renderPlatforms();
					});
				});
			}

			const details = body.createEl("details");
			details.open = true;
			details.createEl("summary", { text: "参数配置" });
			const panel = details.createDiv();

			const actionBar = panel.createDiv();
			actionBar.style.display = "flex";
			actionBar.style.gap = "8px";
			const addBtn = actionBar.createEl("button", { text: "新增公众号" });
			applyThemeButtonStyle(addBtn, "active");
			addBtn.addEventListener("click", () => {
				wxRows.push({ name: "", appid: "", secret: "" });
				renderPlatforms();
			});
			const saveAndEnableBtn = actionBar.createEl("button", {
				text: "保存参数并开启",
			});
			applyThemeButtonStyle(saveAndEnableBtn, "active");
			saveAndEnableBtn.addEventListener("click", async () => {
				const completedRows = wxRows.filter((r) => r.name && r.appid && r.secret);
				if (completedRows.length === 0) {
					new Notice("请至少填写并保存一条完整的公众号参数");
					return;
				}
				wxEnabled = true;
				wxRows = completedRows;
				expanded = false;
				platformExpanded[PlatformType.WECHAT] = false;
				await persist();
				new Notice("微信公众号参数已保存并开启");
				renderPlatforms();
			});
			const clearBtn = actionBar.createEl("button", { text: "清空参数" });
			applyThemeButtonStyle(clearBtn, "default");
			clearBtn.addEventListener("click", async () => {
				wxRows = [{ name: "", appid: "", secret: "" }];
				await persist();
				renderPlatforms();
			});

			wxRows.forEach((row, idx) => {
				const card = panel.createDiv();
				card.style.marginTop = "10px";
				card.style.padding = "8px";
				card.style.border = "1px solid var(--background-modifier-border)";
				card.style.borderRadius = "8px";

				const mkField = (
					label: string,
					key: "name" | "appid" | "secret",
					maskable: boolean,
				) => {
					const f = card.createDiv();
					f.style.display = "grid";
					f.style.rowGap = "4px";
					f.style.marginBottom = "8px";
					f.createEl("label", { text: `${label}:` });
					const rowEl = f.createDiv();
					rowEl.style.display = "grid";
					rowEl.style.gridTemplateColumns = "1fr auto";
					rowEl.style.gap = "6px";
					const input = rowEl.createEl("input", {
						type: maskable ? "password" : "text",
						value: row[key] || "",
						placeholder: `请输入${label}`,
					});
					input.addEventListener("input", () => {
						row[key] = input.value.trim();
					});
					if (maskable) {
						const eye = rowEl.createEl("button", { text: "👁" });
						eye.addEventListener("click", (e) => {
							e.preventDefault();
							input.type =
								input.type === "password" ? "text" : "password";
						});
					}
				};
				mkField("公众号名称", "name", false);
				mkField("AppID", "appid", true);
				mkField("AppSecret", "secret", true);
				const actions = card.createDiv();
				actions.style.display = "flex";
				actions.style.gap = "8px";
				actions.style.marginTop = "4px";
				const del = actions.createEl("button", { text: "删除" });
				applyThemeButtonStyle(del, "danger");
				del.addEventListener("click", () => {
					wxRows.splice(idx, 1);
					renderPlatforms();
				});
				const testBtn = actions.createEl("button", { text: "测试连接" });
				applyThemeButtonStyle(testBtn, "default");
				testBtn.addEventListener("click", async () => {
					if (!row.appid || !row.secret) {
						new Notice("请先填写完整 AppID / AppSecret");
						return;
					}
					if (!this.settings.authKey) {
						new Notice("未配置 AuthKey，无法测试公众号连接");
						return;
					}
					try {
						const tokenRes = await wxGetToken(
							this.settings.authKey,
							row.appid,
							row.secret,
						);
						const tokenData = await tokenRes.json;
						if (tokenData?.access_token) {
							new Notice(
								`测试成功：${row.name || "公众号"} 连接可用`,
							);
						} else {
							new Notice(
								`测试失败：${tokenData?.errmsg || "无法获取 token"}`,
							);
						}
					} catch (error) {
						new Notice(
							`测试失败：${
								error instanceof Error ? error.message : "网络异常"
							}`,
						);
					}
				});
			});
		};

		const renderXPanel = (
			parent: HTMLDivElement,
			config: any,
			onPersist: () => Promise<void>,
		) => {
			const section = parent.createDiv();
			section.style.border = "1px solid var(--background-modifier-border)";
			section.style.borderRadius = "10px";
			section.style.padding = "10px";

			const xCfg = config[PlatformType.TWITTER] || {};
			let enabled = xCfg.enabled || false;
			let expanded = !!platformExpanded[PlatformType.TWITTER];
			let data = {
				apiKey: String(xCfg.apiKey || ""),
				apiSecret: String(xCfg.apiSecret || ""),
				accessToken: String(xCfg.accessToken || ""),
				accessTokenSecret: String(xCfg.accessTokenSecret || ""),
			};

			const persist = async () => {
				if (!config[PlatformType.TWITTER]) config[PlatformType.TWITTER] = {};
				config[PlatformType.TWITTER] = {
					...config[PlatformType.TWITTER],
					enabled,
					...data,
				};
				this.settings.distributionConfig = config;
				await onPersist();
			};

			const header = new Setting(section)
				.setName("X (Twitter)")
				.setDesc("开启后可配置参数，支持折叠显示")
				.addToggle((toggle) => {
					toggle.setValue(enabled);
					toggle.onChange(async (v) => {
						enabled = v;
						expanded = v;
						platformExpanded[PlatformType.TWITTER] = expanded;
						await persist();
						renderPlatforms();
					});
				});
			header.controlEl.style.cursor = "pointer";
			header.controlEl.addEventListener("click", (e) => {
				if ((e.target as HTMLElement).closest(".checkbox-container")) {
					return;
				}
				expanded = !expanded;
				platformExpanded[PlatformType.TWITTER] = expanded;
				renderPlatforms();
			});

			const body = section.createDiv();
			body.style.display = enabled && expanded ? "" : "none";

			const configured =
				!!data.apiKey &&
				!!data.apiSecret &&
				!!data.accessToken &&
				!!data.accessTokenSecret;
			if (configured) {
				const savedList = section.createDiv();
				savedList.style.margin = "8px 0";
				savedList.createEl("div", {
					text: "已保存记录",
					cls: "setting-item-description",
				});
				const listWrap = savedList.createDiv();
				const itemBtn = listWrap.createEl("button", {
					text: "X 默认账号",
				});
				applyThemeButtonStyle(itemBtn, "default");
				itemBtn.addEventListener("click", () => {
					expanded = true;
					platformExpanded[PlatformType.TWITTER] = true;
					renderPlatforms();
				});
			}

			const details = body.createEl("details");
			details.open = true;
			details.createEl("summary", { text: "参数配置" });
			const panel = details.createDiv();

			const mkField = (
				label: string,
				key: keyof typeof data,
				maskable: boolean,
			) => {
				const f = panel.createDiv();
				f.style.display = "grid";
				f.style.rowGap = "4px";
				f.style.marginBottom = "8px";
				f.createEl("label", { text: `${label}:` });
				const row = f.createDiv();
				row.style.display = "grid";
				row.style.gridTemplateColumns = "1fr auto";
				row.style.gap = "6px";
				const input = row.createEl("input", {
					type: maskable ? "password" : "text",
					value: data[key] || "",
					placeholder: `请输入 ${label}`,
				});
				input.addEventListener("input", () => {
					data[key] = input.value.trim();
				});
				const eye = row.createEl("button", { text: "👁" });
				eye.addEventListener("click", (e) => {
					e.preventDefault();
					input.type = input.type === "password" ? "text" : "password";
				});
			};
			mkField("API Key", "apiKey", true);
			mkField("API Secret", "apiSecret", true);
			mkField("Access Token", "accessToken", true);
			mkField("Access Token Secret", "accessTokenSecret", true);

			const save = panel.createEl("button", { text: "保存参数并开启" });
			applyThemeButtonStyle(save, "active");
			save.addEventListener("click", async () => {
				if (
					!data.apiKey ||
					!data.apiSecret ||
					!data.accessToken ||
					!data.accessTokenSecret
				) {
					new Notice("请填写完整 X 参数后再保存");
					return;
				}
				enabled = true;
				expanded = false;
				platformExpanded[PlatformType.TWITTER] = false;
				await persist();
				new Notice("X 参数已保存并开启");
				renderPlatforms();
			});
			const testBtn = panel.createEl("button", { text: "测试连接" });
			testBtn.style.marginLeft = "8px";
			applyThemeButtonStyle(testBtn, "default");
			testBtn.addEventListener("click", async () => {
				if (
					!data.apiKey ||
					!data.apiSecret ||
					!data.accessToken ||
					!data.accessTokenSecret
				) {
					new Notice("请先填写完整 X 参数");
					return;
				}
				try {
					const result = await xVerifyCredentials({
						apiKey: data.apiKey,
						apiSecret: data.apiSecret,
						accessToken: data.accessToken,
						accessTokenSecret: data.accessTokenSecret,
					});
					if (result.ok) {
						new Notice(
							`测试成功：X 连接可用${
								result.username ? `（@${result.username}）` : ""
							}`,
						);
					} else {
						new Notice(`测试失败：${result.error || "鉴权失败"}`);
					}
				} catch (error) {
					new Notice(
						`测试失败：${
							error instanceof Error ? error.message : "网络异常"
						}`,
					);
				}
			});
		};

		const renderZhihuPanel = (
			parent: HTMLDivElement,
			config: any,
			onPersist: () => Promise<void>,
		) => {
			const section = parent.createDiv();
			section.style.border = "1px solid var(--background-modifier-border)";
			section.style.borderRadius = "10px";
			section.style.padding = "10px";
			const zCfg = config[PlatformType.ZHIHU] || {};
			let enabled = zCfg.enabled || false;
			let cookie = String(zCfg.cookie || "");
			let expanded = !!platformExpanded[PlatformType.ZHIHU];
			const header = new Setting(section)
				.setName("知乎")
				.setDesc("开启后可配置参数，支持折叠显示")
				.addToggle((toggle) => {
					toggle.setValue(enabled);
					toggle.onChange(async (v) => {
						enabled = v;
						expanded = v;
						platformExpanded[PlatformType.ZHIHU] = expanded;
						if (!config[PlatformType.ZHIHU]) {
							config[PlatformType.ZHIHU] = {};
						}
						config[PlatformType.ZHIHU].enabled = enabled;
						config[PlatformType.ZHIHU].cookie = cookie;
						this.settings.distributionConfig = config;
						await onPersist();
						renderPlatforms();
					});
				});
			header.controlEl.style.cursor = "pointer";
			header.controlEl.addEventListener("click", (e) => {
				if ((e.target as HTMLElement).closest(".checkbox-container")) {
					return;
				}
				expanded = !expanded;
				platformExpanded[PlatformType.ZHIHU] = expanded;
				renderPlatforms();
			});

			if (cookie) {
				const savedList = section.createDiv();
				savedList.style.margin = "8px 0";
				savedList.createEl("div", {
					text: "已保存记录",
					cls: "setting-item-description",
				});
				const listWrap = savedList.createDiv();
				const itemBtn = listWrap.createEl("button", { text: "知乎默认账号" });
				applyThemeButtonStyle(itemBtn, "default");
				itemBtn.addEventListener("click", () => {
					expanded = true;
					platformExpanded[PlatformType.ZHIHU] = true;
					renderPlatforms();
				});
			}

			const body = section.createDiv();
			body.style.display = enabled && expanded ? "" : "none";
			const details = body.createEl("details");
			details.open = true;
			details.createEl("summary", { text: "参数配置" });
			const panel = details.createDiv();

			const text = panel.createEl("input", {
				type: "password",
				value: cookie,
				placeholder: "请输入知乎 Cookie / Token",
			});
			text.style.width = "100%";
			text.style.marginTop = "8px";
			text.addEventListener("input", () => {
				cookie = text.value.trim();
			});
			const save = panel.createEl("button", { text: "保存参数并开启" });
			applyThemeButtonStyle(save, "active");
			save.style.marginTop = "8px";
			save.addEventListener("click", async () => {
				if (!cookie) {
					new Notice("请填写知乎参数后再保存");
					return;
				}
				enabled = true;
				expanded = false;
				platformExpanded[PlatformType.ZHIHU] = false;
				if (!config[PlatformType.ZHIHU]) {
					config[PlatformType.ZHIHU] = {};
				}
				config[PlatformType.ZHIHU].enabled = true;
				config[PlatformType.ZHIHU].cookie = cookie;
				this.settings.distributionConfig = config;
				await onPersist();
				new Notice("知乎参数已保存并开启");
				renderPlatforms();
			});
			const testBtn = panel.createEl("button", { text: "测试连接" });
			testBtn.style.marginTop = "8px";
			testBtn.style.marginLeft = "8px";
			applyThemeButtonStyle(testBtn, "default");
			testBtn.addEventListener("click", async () => {
				if (!cookie) {
					new Notice("请先填写知乎 Cookie 参数");
					return;
				}
				try {
					const res = await requestUrl({
						url: "https://www.zhihu.com/api/v4/me",
						method: "GET",
						throw: false,
						headers: {
							Cookie: cookie,
							"User-Agent":
								"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
						},
					});
					const data = await res.json;
					if (data?.id || data?.url_token || data?.name) {
						new Notice(
							`测试成功：知乎连接可用${
								data?.name ? `（${data.name}）` : ""
							}`,
						);
					} else {
						new Notice(
							`测试失败：${
								data?.error?.message ||
								data?.message ||
								"认证未通过"
							}`,
						);
					}
				} catch (error) {
					new Notice(
						`测试失败：${
							error instanceof Error ? error.message : "网络异常"
						}`,
					);
				}
			});
		};

		renderPlatforms();
	}
}
