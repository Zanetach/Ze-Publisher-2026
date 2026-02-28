import React, {useEffect, useState} from 'react';
import {useAtom} from 'jotai';
import {Button} from '../ui/button';
import {AvatarConfig, ViteReactSettings} from '../../types';
import {logger} from '../../../../shared/src/logger';
import {AIAnalysisSplitButton, AIStyle, AI_STYLES} from '../ui/ai-analysis-split-button';
import {CustomPromptModal} from '../ui/custom-prompt-modal';
import {analyzeContentWithAI} from '../../services/aiService';
import {articleInfoAtom} from '../../store/atoms';
import {AvatarUpload} from '../ui/AvatarUpload';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from '../ui/select';

interface ArticleInfoProps {
	settings: ViteReactSettings;
	onSaveSettings: () => void;
	onInfoChange: (info: ArticleInfoData) => void;
	onRenderArticle?: () => void;
	onSettingsChange?: (settings: Partial<ViteReactSettings>) => void;
	onOpenAISettings?: () => void;
}

export interface ArticleInfoData {
	author: string;
	authorAvatar?: AvatarConfig;
	publishDate: string;
	articleTitle: string;
	articleSubtitle: string;
	episodeNum: string;
	seriesName: string;
	tags: string[];
	summary: string;
	recommendation: string;
}

// 获取默认作者：个人信息设置 -> 默认值
const getDefaultAuthor = (settings: ViteReactSettings): string => {
	if (settings.personalInfo?.name && settings.personalInfo.name.trim() !== '') {
		return settings.personalInfo.name.trim();
	}
	if (settings.enableDefaultAuthorProfile && settings.defaultAuthorName?.trim()) {
		return settings.defaultAuthorName.trim();
	}
	return '';
};

const getDefaultArticleInfo = (): ArticleInfoData => ({
	author: '',
	authorAvatar: undefined,
	publishDate: '',
	articleTitle: '',
	articleSubtitle: '',
	episodeNum: '',
	seriesName: '',
	tags: [],
	summary: '',
	recommendation: ''
});

export const ArticleInfo: React.FC<ArticleInfoProps> = ({
															settings,
															onSaveSettings,
															onInfoChange,
															onRenderArticle,
															onSettingsChange,
															onOpenAISettings
														}) => {
	const [isAIGenerating, setIsAIGenerating] = useState(false);
	const [isCustomPromptModalOpen, setIsCustomPromptModalOpen] = useState(false);
	const [selectedAIStyleId, setSelectedAIStyleId] = useState<string>(AI_STYLES[0].id);
	const [articleInfo, setArticleInfo] = useAtom(articleInfoAtom);
	const selectedAIStyle = AI_STYLES.find((style) => style.id === selectedAIStyleId) || AI_STYLES[0];

	// 当文章信息变化时通知父组件
	useEffect(() => {
		onInfoChange(articleInfo);
	}, [articleInfo, onInfoChange]);

	const handleInputChange = (field: keyof ArticleInfoData, value: string) => {
		setArticleInfo(prev => ({
			...prev,
			[field]: value
		}));
	};

	const handleTagsChange = (tagsText: string) => {
		// 支持多种分隔符：逗号、换行、分号
		const tags = tagsText
			.split(/[,\n;]+/)
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0);

		setArticleInfo(prev => ({
			...prev,
			tags
		}));
	};

	const handleAIAnalyze = async (style: AIStyle) => {
		// 检查是否配置了API密钥
		const provider = settings.aiProvider || 'claude';
		if (provider === 'claude' && (!settings.authKey || settings.authKey.trim() === '')) {
			alert('请先在设置页面配置Claude API密钥才能使用AI分析功能');
			return;
		}
		if (provider === 'openrouter' && (!settings.openRouterApiKey || settings.openRouterApiKey.trim() === '')) {
			alert('请先在设置页面配置OpenRouter API密钥才能使用AI分析功能');
			return;
		}
		if (provider === 'gemini' && (!settings.geminiApiKey || settings.geminiApiKey.trim() === '')) {
			alert('请先在设置页面配置Gemini API密钥才能使用AI分析功能');
			return;
		}

		// 获取当前活跃的文档
		const app = (window as any).app;
		if (!app) {
			alert('无法获取Obsidian应用实例');
			return;
		}

		const activeFile = app.workspace.getActiveFile();
		if (!activeFile) {
			alert('请先打开一个笔记文件');
			return;
		}

		setIsAIGenerating(true);

		try {
			// 读取文档内容
			const content = await app.vault.read(activeFile);

			// 移除frontmatter，只分析正文内容
			const cleanContent = content.replace(/^---\n[\s\S]*?\n---\n?/, '');

			if (cleanContent.trim().length < 50) {
				alert('文章内容太短，无法进行有效分析');
				return;
			}

			// 获取frontmatter
			const metadata = app.metadataCache.getFileCache(activeFile);
			const frontmatter = metadata?.frontmatter || {};

			// 调用AI分析
			const aiSuggestion = await analyzeContentWithAI(
				cleanContent,
				activeFile.basename,
				style.prompt,
				settings,
				frontmatter
			);

			// 合并现有信息和AI建议
			const finalSuggestion = {
				author: aiSuggestion.author || articleInfo.author || getDefaultAuthor(settings),
				publishDate: aiSuggestion.publishDate || new Date().toISOString().split('T')[0],
				articleTitle: aiSuggestion.articleTitle || activeFile.basename,
				articleSubtitle: aiSuggestion.articleSubtitle || '',
				episodeNum: aiSuggestion.episodeNum || '',
				seriesName: aiSuggestion.seriesName || '',
				tags: aiSuggestion.tags || [],
				// 仅学术风格会返回summary，其他风格不返回该字段
				summary: aiSuggestion.summary !== undefined ? aiSuggestion.summary : '',
				recommendation: aiSuggestion.recommendation || ''
			};

			setArticleInfo(finalSuggestion);
			logger.info(`使用 ${style.name} 生成文章信息完成:`, finalSuggestion);

		} catch (error) {
			logger.error(`使用 ${style.name} 生成文章信息失败:`, error);
			alert(`AI分析失败: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsAIGenerating(false);
		}
	};


	const getCurrentFileName = () => {
		try {
			// 从window对象获取当前活动文件名
			const app = (window as any).app;
			const activeFile = app?.workspace?.getActiveFile?.();
			return activeFile?.basename || '';
		} catch (error) {
			logger.warn('获取当前文件名失败:', error);
			return '';
		}
	};


	const handleClearAll = () => {
		// 完全清空，所有字段都变成空值，显示为placeholder
		setArticleInfo({
			author: '',
			authorAvatar: undefined,
			publishDate: '',
			articleTitle: '',
			articleSubtitle: '',
			episodeNum: '',
			seriesName: '',
			tags: [],
			summary: '',
			recommendation: ''
		});
	};

	const handlePrefillAll = () => {
		setArticleInfo(prev => ({
			...prev,
			author: settings.personalInfo?.name?.trim() || prev.author,
			authorAvatar: settings.personalInfo?.avatar || prev.authorAvatar,
			publishDate: new Date().toISOString().split('T')[0],
			articleTitle: getCurrentFileName() || prev.articleTitle
		}));
	};

	return (
		<div className="w-full space-y-6">
			<div className="space-y-2">
				<div className="flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-[#F8FAFC] px-3 py-2">
					<span className="shrink-0 text-xs font-medium text-[#64748B]">AI分析</span>
					<Select
						value={selectedAIStyleId}
						onValueChange={setSelectedAIStyleId}
					>
						<SelectTrigger
							className="h-8 min-w-0 flex-1 rounded-lg border-[#CBD5E1] bg-white text-[#111827] focus-visible:ring-[#64748B]/30"
							title="选择 AI 分析"
						>
							<span className="flex items-center gap-2 truncate">
								<span>{selectedAIStyle.icon}</span>
								<span className="truncate">{selectedAIStyle.name}</span>
							</span>
						</SelectTrigger>
						<SelectContent className="z-[1200] min-w-[220px] rounded-xl border border-[#D1D5DB] bg-white shadow-lg">
							{AI_STYLES.map((style) => (
								<SelectItem
									key={style.id}
									value={style.id}
									className="text-[#111827]"
								>
									<span>{style.icon}</span>
									<span>{style.name}</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<AIAnalysisSplitButton
						isGenerating={isAIGenerating}
						isDisabled={(() => {
							const provider = settings.aiProvider || 'claude';
							if (provider === 'claude') {
								return !settings.authKey?.trim() || !settings.aiModel?.trim();
							}
							if (provider === 'openrouter') {
								return !settings.openRouterApiKey?.trim() || !settings.openRouterModel?.trim();
							}
							if (provider === 'zenmux') {
								return !settings.zenmuxApiKey?.trim() || !settings.zenmuxModel?.trim();
							}
							if (provider === 'gemini') {
								return !settings.geminiApiKey?.trim() || !settings.geminiModel?.trim();
							}
							return true;
						})()}
						onAnalyze={handleAIAnalyze}
						currentStyle={selectedAIStyle}
					/>
				</div>
				<div className="grid grid-cols-3 gap-2">
					<Button
						onClick={() => setIsCustomPromptModalOpen(true)}
						size="sm"
						variant="outline"
						className="w-full text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] border-[#D1D5DB] text-sm px-2 py-2 rounded-xl font-medium transition-all"
					>
						自定义
					</Button>
					<Button
						onClick={handlePrefillAll}
						size="sm"
						variant="outline"
						className="w-full text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] border-[#D1D5DB] text-sm px-2 py-2 rounded-xl font-medium transition-all"
					>
						预填
					</Button>
					<Button
						onClick={handleClearAll}
						size="sm"
						variant="outline"
						className="w-full text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] border-[#D1D5DB] text-sm px-2 py-2 rounded-xl font-medium transition-all"
					>
						清空
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{/* 作者 */}
				<div className="sm:col-span-2">
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm font-medium text-[#111827]">
							作者
						</label>
						{settings.personalInfo?.name && settings.personalInfo.name.trim() !== '' &&
						 (articleInfo.author !== settings.personalInfo.name || !articleInfo.authorAvatar) && (
							<button
								type="button"
								onClick={() => setArticleInfo(prev => ({
									...prev,
									author: settings.personalInfo!.name,
									authorAvatar: settings.personalInfo!.avatar
								}))}
								className="text-xs text-[#4B5563] hover:text-[#374151] transition-colors"
							>
								使用预设
							</button>
						)}
					</div>
						<div className="flex items-center gap-3">
						{/* 头像 - 可点击上传 */}
						<AvatarUpload
							currentConfig={articleInfo.authorAvatar}
							userName={articleInfo.author}
							onConfigChange={(config) => setArticleInfo(prev => ({ ...prev, authorAvatar: config }))}
							size="xs"
						/>
							<input
								type="text"
								value={articleInfo.author}
								onChange={(e) => handleInputChange('author', e.target.value)}
								className="h-10 flex-1 px-3 py-0 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] text-sm transition-all"
								placeholder="输入作者名称"
							/>
						</div>
					</div>

				{/* 发布日期 */}
				<div className="sm:col-span-2">
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm font-medium text-[#111827]">
							发布日期
						</label>
						{articleInfo.publishDate !== new Date().toISOString().split('T')[0] && (
							<button
								type="button"
								onClick={() => handleInputChange('publishDate', new Date().toISOString().split('T')[0])}
								className="text-xs text-[#4B5563] hover:text-[#374151] transition-colors"
							>
								使用今天
							</button>
						)}
					</div>
					<input
						type="date"
						value={articleInfo.publishDate}
						onChange={(e) => handleInputChange('publishDate', e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] text-sm transition-all"
					/>
				</div>

				{/* 文章标题 */}
				<div className="sm:col-span-2">
					<div className="flex items-center justify-between mb-2">
						<label className="text-sm font-medium text-[#111827]">
							文章标题
						</label>
						{getCurrentFileName() && articleInfo.articleTitle !== getCurrentFileName() && (
							<button
								type="button"
								onClick={() => handleInputChange('articleTitle', getCurrentFileName())}
								className="text-xs text-[#4B5563] hover:text-[#374151] transition-colors"
							>
								使用文件名: {getCurrentFileName()}
							</button>
						)}
					</div>
					<input
						type="text"
						value={articleInfo.articleTitle}
						onChange={(e) => handleInputChange('articleTitle', e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] text-sm transition-all"
						placeholder="输入文章标题"
					/>
				</div>

				{/* 副标题 */}
				<div className="sm:col-span-2">
					<label className="block text-sm font-medium text-[#111827] mb-2">
						副标题
					</label>
					<input
						type="text"
						value={articleInfo.articleSubtitle}
						onChange={(e) => handleInputChange('articleSubtitle', e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] text-sm transition-all"
						placeholder="输入副标题"
					/>
				</div>

				{/* 期数 */}
				<div>
					<label className="block text-sm font-medium text-[#111827] mb-2">
						期数
					</label>
					<input
						type="text"
						value={articleInfo.episodeNum}
						onChange={(e) => handleInputChange('episodeNum', e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] text-sm transition-all"
						placeholder="如：第 51 期"
					/>
				</div>

				{/* 系列名称 */}
				<div>
					<label className="block text-sm font-medium text-[#111827] mb-2">
						系列名称
					</label>
					<input
						type="text"
						value={articleInfo.seriesName}
						onChange={(e) => handleInputChange('seriesName', e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] text-sm transition-all"
						placeholder="如：人文与科技"
					/>
				</div>

				{/* 摘要 */}
				<div className="sm:col-span-2">
					<label className="block text-sm font-medium text-[#111827] mb-2">
						摘要
					</label>
					<textarea
						value={articleInfo.summary}
						onChange={(e) => handleInputChange('summary', e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] h-24 resize-none text-sm transition-all"
						placeholder="输入文章摘要，简要概括文章主要内容"
					/>
				</div>

				{/* 推荐语 */}
				<div className="sm:col-span-2">
					<label className="block text-sm font-medium text-[#111827] mb-2">
						推荐语
					</label>
					<textarea
						value={articleInfo.recommendation}
						onChange={(e) => handleInputChange('recommendation', e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] h-24 resize-none text-sm transition-all"
						placeholder="输入推荐语，吸引读者阅读的亮点或价值"
					/>
				</div>

				{/* 标签 */}
				<div className="sm:col-span-2">
					<label className="block text-sm font-medium text-[#111827] mb-2">
						标签
					</label>
					<textarea
						value={articleInfo.tags.join(', ')}
						onChange={(e) => handleTagsChange(e.target.value)}
						className="w-full px-3 py-3 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] h-20 resize-none text-sm transition-all"
						placeholder="输入标签，支持逗号、换行、分号分隔"
					/>
					<div className="mt-3 flex flex-wrap gap-2">
						{articleInfo.tags.map((tag, index) => (
							<span
								key={index}
								className="inline-block bg-[#F7F4EC] text-[#111827] text-sm px-3 py-1 rounded-full border border-[#E5E7EB]"
							>
								{tag}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* 自定义Prompt模态框 */}
			<CustomPromptModal
				isOpen={isCustomPromptModalOpen}
				onClose={() => setIsCustomPromptModalOpen(false)}
				settings={settings}
				onSettingsChange={onSettingsChange || (() => {
				})}
				onSaveSettings={onSaveSettings}
				onAnalyze={handleAIAnalyze}
			/>

		</div>
	);
};
