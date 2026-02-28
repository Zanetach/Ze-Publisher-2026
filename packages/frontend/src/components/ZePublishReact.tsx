import React, { useCallback, useEffect, useRef, useState } from "react";
import { ZePublishReactProps } from "../types";
import { Toolbar } from "./toolbar/Toolbar";
import { useSetAtom, useAtomValue } from "jotai";
import { initializeSettingsAtom, settingsAtom } from "../store/atoms";
import { articleHTMLAtom, cssContentAtom } from "../store/contentAtoms";
import { HMRTest } from "./HMRTest";
import { ArticleRenderer } from "./ArticleRenderer";
import { ScrollContainer } from "./ScrollContainer";
import { domUpdater } from "../utils/domUpdater";
import { applyCodeBlockScale, findScreenshotElement } from "@ze-publisher/shared";

import { logger } from "../../../shared/src/logger";

type DistributionAction =
	| "wechat_publish"
	| "wechat"
	| "zhihu"
	| "xiaohongshu"
	| "x_publish"
	| "x"
	| "html"
	| "image";

type ExecutionStatus = "pending" | "running" | "success" | "error";

interface ExecutionRecord {
	id: string;
	action: DistributionAction;
	actionLabel: string;
	status: ExecutionStatus;
	startedAt: number;
	finishedAt?: number;
	message: string;
	steps: Array<{ ts: number; text: string; status: ExecutionStatus }>;
}

export const ZePublishReact: React.FC<ZePublishReactProps> = (props) => {
	const {
		settings,
		plugins,
		articleHTML: propsArticleHTML,
		cssContent: propsCssContent,
		onRefresh,
		onCopy,
		onDistribute,
		onTemplateChange,
		onThemeChange,
		onHighlightChange,
		onThemeColorToggle,
		onThemeColorChange,
		onRenderArticle,
		onSaveSettings,
		onUpdateCSSVariables,
		onPluginToggle,
		onPluginConfigChange,
		onExpandedSectionsChange,
		onArticleInfoChange,
		onPersonalInfoChange,
		onSettingsChange,
		onWidthChange,
	} = props;

	// 从atom读取频繁变化的数据，如果atom为空则使用props的值
	const atomArticleHTML = useAtomValue(articleHTMLAtom);
	const atomCssContent = useAtomValue(cssContentAtom);
	const atomSettings = useAtomValue(settingsAtom);

	// 使用atom值或props值作为fallback
	const articleHTML = atomArticleHTML || propsArticleHTML;
	const cssContent = atomCssContent || propsCssContent;

	const initializeSettings = useSetAtom(initializeSettingsAtom);
	const isInitializedRef = useRef(false);

	// Toolbar 参数区折叠状态（左侧图标栏始终保留）
	const [isToolbarCollapsed, setIsToolbarCollapsed] = useState<boolean>(() => {
		try {
			return localStorage.getItem("zepublish-toolbar-collapsed") === "true";
		} catch {
			return false;
		}
	});
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);
	const [distributionAction, setDistributionAction] =
		useState<DistributionAction>("wechat_publish");
	const [executionRecords, setExecutionRecords] = useState<ExecutionRecord[]>(
		[],
	);
	const [isExecuting, setIsExecuting] = useState(false);

	// 代码块缩放预览的恢复函数
	const codeBlockScaleRestoreRef = useRef<(() => void) | null>(null);
	// 内容容器的 ref
	const contentContainerRef = useRef<HTMLDivElement>(null);
	// 渲染滚动容器 ref
	const rendererRef = useRef<HTMLDivElement>(null);
	// 文章滚动容器 ref（仅内容区滚动）
	const articleScrollRef = useRef<HTMLDivElement>(null);

	// 原生滚轮兜底：仅驱动内容区滚动，避免外层容器滚动
	useEffect(() => {
		const el = articleScrollRef.current;
		if (!el) return;

		const onWheel = (event: WheelEvent) => {
			// 仅在确实可滚动时拦截，避免影响其它交互
			if (el.scrollHeight <= el.clientHeight) return;
			event.preventDefault();
			el.scrollTop += event.deltaY;
		};

		el.addEventListener("wheel", onWheel, {
			passive: false,
			capture: true,
		});
		return () => {
			el.removeEventListener("wheel", onWheel, true);
		};
	}, []);

	// 初始化Jotai状态 - 只初始化一次
	useEffect(() => {
		if (!isInitializedRef.current && settings) {
			const personalInfo = settings.personalInfo || {
				name: "",
				avatar: { type: "default" },
				bio: "",
				email: "",
				website: "",
			};

			initializeSettings({
				settings,
				personalInfo,
			});

			isInitializedRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // 只在组件挂载时执行

	// 监听代码块缩放设置变化，实时应用/恢复缩放效果
	useEffect(() => {
		// 使用 props.settings 作为 fallback，确保首次渲染时能获取正确的设置
		const shouldScale =
			atomSettings.scaleCodeBlockInImage ??
			settings.scaleCodeBlockInImage ??
			true;
		const container = contentContainerRef.current;

		if (!container) return;

		// 如果 articleHTML 为空，不执行缩放
		if (!articleHTML) return;

		// 使用 requestAnimationFrame 确保 CSS 已经应用后再执行缩放检测
		// 这解决了初始化时 CSS 可能还没完全应用的问题
		const rafId = requestAnimationFrame(() => {
			// 先恢复之前的缩放
			if (codeBlockScaleRestoreRef.current) {
				codeBlockScaleRestoreRef.current();
				codeBlockScaleRestoreRef.current = null;
			}

			// 如果启用缩放，应用缩放效果
			if (shouldScale) {
				const result = findScreenshotElement(container);
				if (result) {
					const { restore } = applyCodeBlockScale(result.element);
					codeBlockScaleRestoreRef.current = restore;
					logger.debug("[ZePublishReact] 已应用代码块缩放预览");
				}
			} else {
				logger.debug("[ZePublishReact] 已关闭代码块缩放预览");
			}
		});

		// 组件卸载时恢复
		return () => {
			cancelAnimationFrame(rafId);
			if (codeBlockScaleRestoreRef.current) {
				codeBlockScaleRestoreRef.current();
				codeBlockScaleRestoreRef.current = null;
			}
		};
	}, [
		atomSettings.scaleCodeBlockInImage,
		settings.scaleCodeBlockInImage,
		articleHTML,
	]); // 当设置或文章内容变化时重新计算

	// 监听容器宽度变化，用于通知宽度改变
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		let widthChangeTimer: NodeJS.Timeout | null = null;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const containerWidth = entry.contentRect.width;
				setContainerWidth(containerWidth);
				if (widthChangeTimer) clearTimeout(widthChangeTimer);
				widthChangeTimer = setTimeout(() => {
					onWidthChange?.(containerWidth);
				}, 200);
			}
		});

		resizeObserver.observe(container);

		return () => {
			if (widthChangeTimer) clearTimeout(widthChangeTimer);
			resizeObserver.disconnect();
		};
	}, [onWidthChange]);

	// 切换 Toolbar 显示/隐藏
	const toggleToolbar = useCallback(() => {
		setIsToolbarCollapsed((prev) => {
			const newVal = !prev;
			try {
				localStorage.setItem(
					"zepublish-toolbar-collapsed",
					String(newVal),
				);
			} catch {}
			return newVal;
		});
	}, []);

	// 提取 Toolbar props，避免重复代码
	const toolbarProps = {
		settings,
		plugins,
		articleHTML,
		onRefresh,
		onCopy,
		onDistribute,
		onTemplateChange,
		onThemeChange,
		onHighlightChange,
		onThemeColorToggle,
		onThemeColorChange,
		onRenderArticle,
		onSaveSettings,
		onPluginToggle,
		onPluginConfigChange,
		onExpandedSectionsChange,
		onArticleInfoChange,
		onPersonalInfoChange,
		onSettingsChange,
		onToggleToolbar: toggleToolbar,
	};

	const actionLabelMap: Record<DistributionAction, string> = {
		wechat_publish: "发布公众号草稿箱",
		wechat: "复制公众号格式",
		zhihu: "复制知乎格式",
		xiaohongshu: "复制小红书格式",
		x_publish: "发布到 X",
		x: "复制 X 文本",
		html: "复制 HTML",
		image: "复制图片",
	};

	const formatTime = (ts: number) =>
		new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });

	const runDistributionAction = async () => {
		if (isExecuting) return;
		const action = distributionAction;
		const actionLabel = actionLabelMap[action] || action;
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const startedAt = Date.now();

		setIsExecuting(true);
		setExecutionRecords((prev) => [
			{
				id,
				action,
				actionLabel,
				status: "running",
				startedAt,
				message: "执行中",
				steps: [
					{ ts: startedAt, text: "已触发执行", status: "pending" },
					{ ts: Date.now(), text: "处理中", status: "running" },
				],
			},
			...prev,
		]);

		try {
			await onCopy?.(action);
			const finishedAt = Date.now();
			setExecutionRecords((prev) =>
				prev.map((r) =>
					r.id === id
						? {
								...r,
								status: "success",
								finishedAt,
								message: "执行成功",
								steps: [
									...r.steps,
									{
										ts: finishedAt,
										text: "执行完成（成功）",
										status: "success",
									},
								],
							}
						: r,
				),
			);
		} catch (error) {
			const finishedAt = Date.now();
			const errText =
				error instanceof Error ? error.message : "执行失败";
			setExecutionRecords((prev) =>
				prev.map((r) =>
					r.id === id
						? {
								...r,
								status: "error",
								finishedAt,
								message: `执行失败：${errText}`,
								steps: [
									...r.steps,
									{
										ts: finishedAt,
										text: `执行失败：${errText}`,
										status: "error",
									},
								],
							}
						: r,
				),
			);
		} finally {
			setIsExecuting(false);
		}
	};

	// 工具栏固定在左侧（不再支持右侧切换）
	const isToolbarLeft = true;
	const uiThemeMode =
		atomSettings.uiThemeMode ?? settings.uiThemeMode ?? "auto";

	const detectHostDarkMode = useCallback(() => {
		try {
			const bodyDark = document.body.classList.contains("theme-dark");
			const htmlDark =
				document.documentElement.classList.contains("theme-dark");
			return bodyDark || htmlDark;
		} catch {
			return false;
		}
	}, []);

	const [isHostDarkMode, setIsHostDarkMode] = useState<boolean>(() =>
		detectHostDarkMode(),
	);

	useEffect(() => {
		const update = () => setIsHostDarkMode(detectHostDarkMode());
		update();

		const observer = new MutationObserver(update);
		observer.observe(document.body, {
			attributes: true,
			attributeFilter: ["class"],
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => observer.disconnect();
	}, [detectHostDarkMode]);

	const isUIDark =
		uiThemeMode === "dark" || (uiThemeMode === "auto" && isHostDarkMode);
	const isTinyWindow = containerWidth > 0 && containerWidth < 860;
	const isNarrowWindow = containerWidth > 0 && containerWidth < 1180;
	const isCompactWindow = containerWidth > 0 && containerWidth < 980;
	const rendererMinWidth = isTinyWindow
		? 0
		: isCompactWindow
			? 260
			: isNarrowWindow
				? 320
				: 420;
	const toolbarWidth = isCompactWindow
		? "clamp(240px, 44vw, 360px)"
		: isNarrowWindow
			? "clamp(280px, 40vw, 420px)"
			: "clamp(320px, 38vw, 520px)";
	const toolbarMaxWidth = isCompactWindow
		? "56%"
		: isNarrowWindow
			? "50%"
			: "46%";
	const shellPadding = isCompactWindow ? "0" : "0";
	const uiColors = isUIDark
		? {
				pageBg: "#1F2023",
				pageText: "#e5e7eb",
				rendererBg: "#1F2023",
				cardBg: "#222327",
				cardBorder: "rgba(148,163,184,0.35)",
				cardShadow: "none",
				headerBg: "rgba(34,35,39,0.96)",
				headerBorder: "#3a3b40",
				panelBorder: "#3a3b40",
				toolbarBg: "#222327",
				toggleBtnBg: "#2a2b30",
				toggleBtnBorder: "#3a3b40",
				toggleBtnHoverBg: "#33343a",
				toggleBtnHoverBorder: "#4a4b50",
			}
		: {
				pageBg: "#ffffff",
				pageText: "#1a1a1a",
				rendererBg: "#ffffff",
				cardBg: "#ffffff",
				cardBorder: "rgba(148,163,184,0.24)",
				cardShadow: "none",
				headerBg: "#ffffff",
				headerBorder: "#e5e7eb",
				panelBorder: "#e5e5e5",
				toolbarBg: "#ffffff",
				toggleBtnBg: "#fff",
				toggleBtnBorder: "#E8E6DC",
				toggleBtnHoverBg: "#F9F9F7",
				toggleBtnHoverBorder: "#D97757",
			};

	return (
		<div
			ref={containerRef}
			className="note-preview"
			data-ui-theme={isUIDark ? "dark" : "light"}
			style={{
				display: "flex",
				flexDirection: isToolbarLeft ? "row-reverse" : "row", // 根据设置调整布局方向
				height: "100%",
				minHeight: 0,
				width: "100%",
				overflow: "hidden",
				position: "relative",
				isolation: "isolate", // 创建新的层叠上下文，防止外部动画影响
				// 🔑 直接设置背景色，防止 Obsidian CSS 变量穿透
				background: uiColors.pageBg,
				color: uiColors.pageText,
			}}
		>
			{/* 左侧渲染区域 - 始终可见，占用剩余空间 */}
			<ScrollContainer
				ref={rendererRef}
				className="zepublish-renderer"
				tabIndex={0}
				onMouseEnter={() => rendererRef.current?.focus()}
				onMouseDown={() => rendererRef.current?.focus()}
				style={{
					WebkitUserSelect: "text",
					userSelect: "text",
					flex: "1", // 占用剩余空间，宽度 = C - B - resizer（当B显示时）或 C（当B隐藏时）
					height: "100%",
					minHeight: 0,
					minWidth: `${rendererMinWidth}px`,
					overflow: "hidden",
					scrollBehavior: "smooth",
					scrollbarGutter: "auto",
					borderRight:
						!isToolbarLeft
							? `1px solid ${uiColors.panelBorder}`
							: "none",
					borderLeft:
						isToolbarLeft
							? `1px solid ${uiColors.panelBorder}`
							: "none",
					position: "relative", // 为绝对定位的复制按钮提供定位上下文
					display: "flex",
					flexDirection: "column",
					padding: shellPadding,
					background: uiColors.rendererBg,
					color: uiColors.pageText,
					outline: "none",
				}}
			>
				{/* 内容容器 */}
				<div
					ref={contentContainerRef}
					className="zepublish-content-container"
					style={{
						position: "relative",
						maxWidth: "none",
						width: "100%",
						height: "100%",
						minHeight: 0,
						margin: "0",
						borderRadius: "0",
						border: "none",
						background: uiColors.cardBg,
						boxShadow: uiColors.cardShadow,
						overflow: "hidden",
						display: "flex",
						flexDirection: "column",
					}}
				>
					{/* 复制按钮和工具栏切换按钮容器 - sticky 置顶区域 */}
					<div
						style={{
							position: "sticky",
							top: 0,
							right: 0,
							zIndex: 40,
							display: "flex",
							gap: "8px",
							alignItems: "center",
							justifyContent: "flex-start",
							padding: "12px 16px",
							background: uiColors.headerBg,
							borderBottom: `1px solid ${uiColors.headerBorder}`,
							backdropFilter: "none",
							boxShadow: "none",
						}}
					>
						<select
							value={distributionAction}
							onChange={(e) =>
								setDistributionAction(
									e.target.value as DistributionAction,
								)
							}
							title="选择分发动作"
							style={{
								height: "32px",
								borderRadius: "8px",
								border: `1px solid ${uiColors.toggleBtnBorder}`,
								backgroundColor: uiColors.toggleBtnBg,
								color: isUIDark ? "#e5e7eb" : "#374151",
								padding: "0 8px",
								fontSize: "12px",
								outline: "none",
							}}
						>
							<option value="wechat_publish">
								发布到公众号草稿箱
							</option>
							<option value="wechat">复制为公众号格式</option>
							<option value="zhihu">复制为知乎格式</option>
							<option value="xiaohongshu">复制为小红书格式</option>
							<option value="x_publish">发布到 X（推文）</option>
							<option value="x">复制为 X 文本</option>
							<option value="html">复制 HTML</option>
							<option value="image">复制图片</option>
						</select>
						<button
							onClick={runDistributionAction}
							title="执行分发动作"
							disabled={isExecuting}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: "32px",
								padding: "0 12px",
								borderRadius: "8px",
								border: `1px solid ${uiColors.toggleBtnBorder}`,
								backgroundColor: uiColors.toggleBtnBg,
								color: isUIDark ? "#e5e7eb" : "#374151",
								cursor: isExecuting ? "not-allowed" : "pointer",
								opacity: isExecuting ? 0.75 : 1,
								fontSize: "12px",
								fontWeight: 600,
								transition: "all 0.2s ease",
							}}
							onMouseEnter={(e) => {
								e.currentTarget.style.backgroundColor =
									uiColors.toggleBtnHoverBg;
								e.currentTarget.style.borderColor =
									uiColors.toggleBtnHoverBorder;
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.backgroundColor =
									uiColors.toggleBtnBg;
								e.currentTarget.style.borderColor =
									uiColors.toggleBtnBorder;
							}}
						>
							{isExecuting ? "执行中..." : "执行"}
						</button>
					</div>
					{executionRecords.length > 0 && (
						<div
							style={{
								margin: "0 16px 8px",
								padding: "10px 12px",
								border: `1px solid ${uiColors.headerBorder}`,
								borderRadius: "10px",
								background: isUIDark ? "#222327" : "#FFFFFF",
							}}
						>
							<div
								style={{
									fontSize: "12px",
									fontWeight: 600,
									marginBottom: "8px",
									color: isUIDark ? "#E5E7EB" : "#111827",
								}}
							>
								执行状态链路
							</div>
							<div style={{ display: "grid", gap: "8px" }}>
								{executionRecords.slice(0, 4).map((record) => (
									<div
										key={record.id}
										style={{
											border: `1px solid ${uiColors.headerBorder}`,
											borderRadius: "8px",
											padding: "8px",
											background: isUIDark
												? "#1F2023"
												: "#FAFAFA",
										}}
									>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												gap: "8px",
												fontSize: "12px",
												marginBottom: "4px",
											}}
										>
											<span
												style={{
													color: isUIDark
														? "#E5E7EB"
														: "#111827",
													fontWeight: 600,
												}}
											>
												{record.actionLabel}
											</span>
											<span
												style={{
													color:
														record.status === "success"
															? "#16A34A"
															: record.status === "error"
																? "#DC2626"
																: isUIDark
																	? "#CBD5E1"
																	: "#4B5563",
												}}
											>
												{record.status === "running"
													? "执行中"
													: record.status === "success"
														? "成功"
														: record.status === "error"
															? "失败"
															: "待处理"}
											</span>
										</div>
										<div
											style={{
												fontSize: "11px",
												color: isUIDark
													? "#94A3B8"
													: "#6B7280",
												marginBottom: "4px",
											}}
										>
											开始：{formatTime(record.startedAt)}
											{record.finishedAt
												? `  · 结束：${formatTime(record.finishedAt)}`
												: ""}
										</div>
										<div
											style={{
												display: "grid",
												gap: "2px",
												fontSize: "11px",
												color: isUIDark
													? "#CBD5E1"
													: "#374151",
											}}
										>
											{record.steps.map((s, idx) => (
												<div key={`${record.id}-step-${idx}`}>
													{formatTime(s.ts)} · {s.text}
												</div>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
					{/* 动态样式：来自主题和高亮 */}
					<style
						title="zepublish-style"
						ref={(el) => {
							if (el) {
								domUpdater.setStyleElement(el);
							}
						}}
					>
						{cssContent}
					</style>
					<style>{`
	              #article-section.zepublish {
	                margin: 0 !important;
	                padding: 0 !important;
	                border: none !important;
	                border-radius: 0 !important;
	                box-shadow: none !important;
	                background: transparent !important;
	              }
	              #article-section.zepublish > *:first-child {
	                margin-top: 0 !important;
	              }
	              .zepublish-mermaid-wrapper {
	                margin: 16px 0;
	                overflow-x: auto;
	              }
	              .zepublish-mermaid-wrapper svg {
	                max-width: 100%;
	                width: auto;
	                height: auto;
	                margin: 0 auto;
	                display: block;
	              }
	              .zepublish-author-tail {
	                margin-top: 20px;
	              }
	              .zepublish-author-tail img {
	                display: block;
	                width: 100%;
	                max-width: 100%;
	                height: auto;
	                border-radius: 12px;
	              }
	            `}</style>
					<div
						ref={articleScrollRef}
						className="zepublish-article-scroll"
						style={{
							flex: 1,
							minHeight: 0,
							overflowY: "auto",
							overflowX: "hidden",
							padding: "22px 24px 24px",
							color: isUIDark ? "#e2e8f0" : undefined,
							background: "transparent",
						}}
					>
						<ArticleRenderer html={articleHTML} />
					</div>
				</div>
			</ScrollContainer>

			{/* 工具栏容器 - 折叠时仅保留左侧图标栏 */}
			<div
				className="toolbar-container"
				style={{
					width: isToolbarCollapsed ? "56px" : toolbarWidth,
					minWidth: isToolbarCollapsed
						? "56px"
						: isTinyWindow
							? "220px"
							: "260px",
					maxWidth: isToolbarCollapsed ? "56px" : toolbarMaxWidth,
					height: "100%",
					minHeight: 0,
					overflowY: "auto",
					overflowX: "hidden",
					flexShrink: 0,
					borderLeft: !isToolbarLeft
						? `1px solid ${uiColors.panelBorder}`
						: "none",
					borderRight: isToolbarLeft
						? `1px solid ${uiColors.panelBorder}`
						: "none",
					backgroundColor: uiColors.toolbarBg,
					transition: "width 0.2s ease",
				}}
			>
				<Toolbar
					{...toolbarProps}
					isUIDark={isUIDark}
					isContentCollapsed={isToolbarCollapsed}
				/>
			</div>

			{/* HMR 测试指示器 - 仅在开发模式显示 */}
			{((window as any).__ZEPUBLISH_HMR_MODE__ ||
				(window as any).__LOVPEN_HMR_MODE__) && <HMRTest />}
		</div>
	);
};
