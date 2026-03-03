import React, { useState, useEffect } from "react";
import { PersonalInfoSettings } from "./PersonalInfoSettings";
import { AISettings } from "./AISettings";
import { PersonalInfo, ViteReactSettings } from "../../types";
import {
	Bot,
	Globe,
	Settings,
	User,
	X,
	PanelLeft,
	PanelRight,
	Image,
	Monitor,
	Moon,
	Sun,
} from "lucide-react";
import { useSettings } from "../../hooks/useSettings";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onPersonalInfoChange?: (info: PersonalInfo) => void;
	onSaveSettings?: () => void;
	onSettingsChange?: (settings: Partial<ViteReactSettings>) => void;
	initialTab?: "personal" | "ai" | "general";
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	onPersonalInfoChange,
	onSaveSettings,
	onSettingsChange,
	initialTab,
}) => {
	const { saveStatus, settings, updateSettings, saveSettings } = useSettings(
		onSaveSettings,
		onPersonalInfoChange,
		onSettingsChange,
	);
	const [activeTab, setActiveTab] = useState<"personal" | "ai" | "general">(
		() => {
			if (initialTab) return initialTab;
			try {
				const saved = localStorage.getItem(
					"zepublish-settings-active-tab",
				) as "personal" | "ai" | "general";
				return saved || "personal";
			} catch {
				return "personal";
			}
		},
	);

	// 当 initialTab 或 isOpen 变化时更新 activeTab
	useEffect(() => {
		if (isOpen && initialTab) {
			setActiveTab(initialTab);
		}
	}, [isOpen, initialTab]);

	// 调试信息
	React.useEffect(() => {
		if (isOpen) {
			console.log("[SettingsModal] Modal opened");
			console.log(
				"[SettingsModal] onPersonalInfoChange:",
				!!onPersonalInfoChange,
			);
			console.log("[SettingsModal] onSaveSettings:", !!onSaveSettings);
			console.log(
				"[SettingsModal] onSettingsChange:",
				!!onSettingsChange,
			);
		}
	}, [isOpen, onPersonalInfoChange, onSaveSettings, onSettingsChange]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
			{/* 背景遮罩 */}
			<div
				className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm"
				onClick={onClose}
			/>

			{/* 模态框内容 - 温暖学术风格 */}
			<div className="relative z-10 w-full max-w-sm sm:max-w-2xl lg:max-w-5xl max-h-[95vh] overflow-hidden">
				<div className="bg-[#F8FAFC] rounded-2xl shadow-xl border border-[#CBD5E1]">
					{/* 头部 - 使用暖色调 */}
					<div className="relative bg-[#E2E8F0] px-3 sm:px-6 py-4 sm:py-6 border-b border-[#CBD5E1]">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-[#0F766E]/10 rounded-xl">
									<Settings className="h-6 w-6 text-[#0F766E]" />
								</div>
								<div>
									<h2 className="text-2xl font-serif font-semibold text-[#0F172A]">
										应用设置
									</h2>
									<p className="text-[#64748B] mt-1">
										配置您的个人信息和应用偏好
									</p>
								</div>
							</div>
							<button
								onClick={onClose}
								className="p-2 hover:bg-[#0F766E]/10 rounded-xl transition-colors text-[#64748B] hover:text-[#0F766E]"
							>
								<X className="h-6 w-6" />
							</button>
						</div>

						{/* 标签页导航 */}
						<div className="flex gap-2 mt-6">
							{[
								{
									key: "personal",
									label: "个人信息",
									icon: User,
								},
								{ key: "ai", label: "AI设置", icon: Bot },
								{
									key: "general",
									label: "通用设置",
									icon: Globe,
								},
							].map(({ key, label, icon: Icon }) => (
								<button
									key={key}
									onClick={() => {
										const tabKey = key as
											| "personal"
											| "ai"
											| "general";
										setActiveTab(tabKey);
										try {
											localStorage.setItem(
												"zepublish-settings-active-tab",
												tabKey,
											);
										} catch (error) {
											console.warn(
												"Failed to save settings tab to localStorage:",
												error,
											);
										}
									}}
									className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
										activeTab === key
											? "bg-white text-[#0F766E] shadow-sm border border-[#CBD5E1]"
											: "text-[#64748B] hover:bg-white/50 hover:text-[#0F172A]"
									}`}
								>
									<Icon className="h-4 w-4" />
									<span className="font-medium">{label}</span>
								</button>
							))}
						</div>
					</div>

					{/* 内容区域 */}
					<div className="p-6 max-h-[60vh] overflow-y-auto bg-[#F8FAFC]">
						{activeTab === "personal" && (
							<PersonalInfoSettings
								onClose={onClose}
								onPersonalInfoChange={onPersonalInfoChange}
								onSaveSettings={onSaveSettings}
							/>
						)}

						{activeTab === "ai" && (
							<AISettings
								onClose={onClose}
								onSettingsChange={onSettingsChange}
								onSaveSettings={onSaveSettings}
							/>
						)}

						{activeTab === "general" && (
							<div className="space-y-6">
								<div className="text-center">
									<h3 className="text-lg font-serif font-semibold text-[#0F172A] mb-2">
										通用设置
									</h3>
									<p className="text-[#64748B]">
										应用的基础配置和偏好设置
									</p>
								</div>

								{/* 工具栏位置设置 */}
								<div className="bg-white border border-[#CBD5E1] rounded-2xl p-4">
									<div className="flex items-center gap-3 mb-4">
										<div className="p-2 bg-[#E2E8F0] rounded-xl">
											<PanelLeft className="h-5 w-5 text-[#0F766E]" />
										</div>
										<div>
											<h4 className="font-semibold text-[#0F172A]">
												工具栏位置
											</h4>
											<p className="text-sm text-[#64748B]">
												选择工具栏显示在预览区域的左侧或右侧
											</p>
										</div>
									</div>
									<div className="flex gap-3">
										<button
											onClick={() => {
												updateSettings({
													toolbarPosition: "left",
												});
												saveSettings();
											}}
											className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
												settings.toolbarPosition ===
												"left"
													? "bg-[#0F766E] text-white border-[#0F766E]"
													: "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#0F766E]/40"
											}`}
										>
											<PanelLeft className="h-4 w-4" />
											<span>左侧</span>
										</button>
										<button
											onClick={() => {
												updateSettings({
													toolbarPosition: "right",
												});
												saveSettings();
											}}
											className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
												(settings.toolbarPosition ??
													"right") === "right"
													? "bg-[#0F766E] text-white border-[#0F766E]"
													: "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#0F766E]/40"
											}`}
										>
											<PanelRight className="h-4 w-4" />
											<span>右侧</span>
										</button>
									</div>
								</div>

								{/* 插件UI主题模式 */}
								<div className="bg-white border border-[#CBD5E1] rounded-2xl p-4">
									<div className="flex items-center gap-3 mb-4">
										<div className="p-2 bg-[#E2E8F0] rounded-xl">
											<Monitor className="h-5 w-5 text-[#0F766E]" />
										</div>
										<div>
											<h4 className="font-semibold text-[#0F172A]">
												插件主题模式
											</h4>
											<p className="text-sm text-[#64748B]">
												切换插件界面为浅色、暗色或自动跟随
												Obsidian
											</p>
										</div>
									</div>
									<div className="grid grid-cols-3 gap-2">
										{[
											{
												key: "light",
												label: "浅色",
												icon: Sun,
											},
											{
												key: "dark",
												label: "暗色",
												icon: Moon,
											},
											{
												key: "auto",
												label: "自动",
												icon: Monitor,
											},
										].map(({ key, label, icon: Icon }) => {
											const active =
												(settings.uiThemeMode ??
													"auto") === key;
											return (
												<button
													key={key}
													onClick={() => {
														updateSettings({
															uiThemeMode: key as
																| "auto"
																| "light"
																| "dark",
														});
														saveSettings();
													}}
													className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
														active
															? "bg-[#0F766E] text-white border-[#0F766E]"
															: "bg-white text-[#0F172A] border-[#CBD5E1] hover:border-[#0F766E]/40"
													}`}
												>
													<Icon className="h-4 w-4" />
													<span>{label}</span>
												</button>
											);
										})}
									</div>
								</div>

								{/* 图片导出设置 */}
								<div className="bg-white border border-[#CBD5E1] rounded-2xl p-4">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="p-2 bg-[#E2E8F0] rounded-xl">
												<Image className="h-5 w-5 text-[#0F766E]" />
											</div>
											<div>
												<h4 className="font-semibold text-[#0F172A]">
													代码块自动缩放
												</h4>
												<p className="text-sm text-[#64748B]">
													复制为图片时，自动缩放溢出的代码块以完整显示
												</p>
											</div>
										</div>
										<button
											onClick={() => {
												const newValue = !(
													settings.scaleCodeBlockInImage ??
													true
												);
												updateSettings({
													scaleCodeBlockInImage:
														newValue,
												});
												saveSettings();
											}}
											className={`relative w-12 h-6 rounded-full transition-colors ${
												(settings.scaleCodeBlockInImage ??
												true)
													? "bg-[#0F766E]"
													: "bg-[#CBD5E1]"
											}`}
										>
											<span
												className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
													(settings.scaleCodeBlockInImage ??
													true)
														? "translate-x-7"
														: "translate-x-1"
												}`}
											/>
										</button>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{[
										{
											title: "语言偏好",
											desc: "设置界面显示语言",
											icon: "🌍",
											status: "即将推出",
										},
										{
											title: "快捷键配置",
											desc: "自定义键盘快捷键",
											icon: "⌨️",
											status: "即将推出",
										},
										{
											title: "数据导入/导出",
											desc: "备份和恢复设置数据",
											icon: "📁",
											status: "即将推出",
										},
									].map((feature, index) => (
										<div
											key={index}
											className="group bg-white border border-[#CBD5E1] rounded-2xl p-4 hover:border-[#0F766E]/40 hover:shadow-md transition-all"
										>
											<div className="flex items-center gap-3 mb-3">
												<div className="p-2 bg-[#E2E8F0] group-hover:bg-[#0F766E]/10 rounded-xl transition-colors">
													<span className="text-xl">
														{feature.icon}
													</span>
												</div>
												<div>
													<h4 className="font-semibold text-[#0F172A]">
														{feature.title}
													</h4>
													<p className="text-sm text-[#64748B]">
														{feature.desc}
													</p>
												</div>
											</div>
											<div className="flex items-center justify-between">
												<span className="text-xs text-[#0F766E] bg-[#0F766E]/10 px-2 py-1 rounded-full">
													{feature.status}
												</span>
											</div>
										</div>
									))}
								</div>

								<div className="bg-[#E2E8F0] border border-[#CBD5E1] rounded-2xl p-4">
									<h4 className="font-serif font-medium text-[#0F172A] mb-2">
										功能路线图
									</h4>
									<p className="text-sm text-[#64748B]">
										我们正在持续完善应用功能，更多实用设置选项将在后续版本中推出。
										如果您有特定需求或建议，欢迎反馈！
									</p>
								</div>
							</div>
						)}
					</div>

					{/* 底部操作栏 */}
					<div className="border-t border-[#CBD5E1] bg-[#E2E8F0] px-6 py-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-sm text-[#64748B]">
								<span
									className={`w-2 h-2 rounded-full ${
										saveStatus === "saved"
											? "bg-[#7C9A5E]"
											: saveStatus === "saving"
												? "bg-[#0F766E]"
												: saveStatus === "error"
													? "bg-[#B85450]"
													: "bg-[#64748B]"
									}`}
								></span>
								{saveStatus === "saved"
									? "设置已同步保存"
									: saveStatus === "saving"
										? "正在保存..."
										: saveStatus === "error"
											? "保存失败"
											: "等待保存"}
							</div>
							<button
								onClick={() => {
									console.log(
										"[SettingsModal] 完成设置 button clicked!",
									);
									if (onSaveSettings) {
										console.log(
											"[SettingsModal] Auto-saving before close",
										);
										onSaveSettings();
									}
									onClose();
								}}
								className="px-6 py-2 bg-[#0F766E] hover:bg-[#B86A4E] text-white rounded-xl transition-all shadow-sm font-medium"
							>
								完成设置
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
