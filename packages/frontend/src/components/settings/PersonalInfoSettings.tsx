import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { PersonalInfo, AvatarConfig, SocialLinks } from "../../types";
import { AtSign, Globe, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { useSettings } from "../../hooks/useSettings";
import { AvatarUpload } from "../ui/AvatarUpload";

interface PersonalInfoSettingsProps {
	onClose: () => void;
	onPersonalInfoChange?: (info: PersonalInfo) => void;
	onSaveSettings?: () => void;
}

const defaultPersonalInfo: PersonalInfo = {
	name: "",
	avatar: { type: "default" },
	bio: "",
	email: "",
	website: "",
	socialLinks: {},
};

// 社交平台配置
const SOCIAL_PLATFORMS: {
	key: keyof SocialLinks;
	label: string;
	placeholder: string;
}[] = [
	{ key: "twitter", label: "X/Twitter", placeholder: "@username" },
	{ key: "github", label: "GitHub", placeholder: "username" },
	{ key: "zhihu", label: "知乎", placeholder: "用户名或链接" },
	{ key: "xiaohongshu", label: "小红书", placeholder: "用户名或链接" },
	{ key: "weibo", label: "微博", placeholder: "@用户名" },
	{ key: "wechat", label: "公众号", placeholder: "公众号名称" },
	{ key: "linkedin", label: "LinkedIn", placeholder: "username" },
];

export const PersonalInfoSettings: React.FC<PersonalInfoSettingsProps> = ({
	onClose,
	onPersonalInfoChange,
	onSaveSettings,
}) => {
	const { personalInfo, updatePersonalInfo } = useSettings(
		onSaveSettings,
		onPersonalInfoChange,
	);

	const [localInfo, setLocalInfo] = useState<PersonalInfo>(() => ({
		...defaultPersonalInfo,
		...personalInfo,
	}));
	const [showSocial, setShowSocial] = useState(false);
	const isUserEditing = React.useRef(false);

	// 监听外部 personalInfo 变化（如初始化后数据加载）
	useEffect(() => {
		// 如果用户正在编辑，不要覆盖
		if (isUserEditing.current) return;
		// 如果外部数据有值且与本地不同，更新本地
		if (personalInfo.name && personalInfo.name !== localInfo.name) {
			setLocalInfo({ ...defaultPersonalInfo, ...personalInfo });
		}
	}, [personalInfo]);

	// 用户编辑时更新 localInfo 并同步到 jotai
	const updateLocal = (newInfo: PersonalInfo) => {
		isUserEditing.current = true;
		setLocalInfo(newInfo);
		updatePersonalInfo(newInfo);
		// 短暂延迟后重置编辑状态
		setTimeout(() => {
			isUserEditing.current = false;
		}, 500);
	};

	const handleInputChange = (field: keyof PersonalInfo, value: string) => {
		updateLocal({ ...localInfo, [field]: value });
	};

	const handleSocialChange = (key: keyof SocialLinks, value: string) => {
		updateLocal({
			...localInfo,
			socialLinks: { ...localInfo.socialLinks, [key]: value },
		});
	};

	const handleAvatarConfigChange = (avatarConfig: AvatarConfig) => {
		updateLocal({ ...localInfo, avatar: avatarConfig });
	};

	const handleReset = () => {
		if (confirm("确定要重置个人信息吗？")) {
			setLocalInfo(defaultPersonalInfo);
			updatePersonalInfo(defaultPersonalInfo);
		}
	};

	// 计算已填写的社交平台数量
	const filledSocialCount = Object.values(localInfo.socialLinks || {}).filter(
		(v) => v?.trim(),
	).length;

	return (
		<div className="space-y-3">
			{/* 头像 + 姓名 */}
			<div className="flex items-center gap-3">
				<AvatarUpload
					currentConfig={localInfo.avatar}
					userName={localInfo.name}
					onConfigChange={handleAvatarConfigChange}
					size="sm"
				/>
				<div className="flex-1">
					<input
						type="text"
						value={localInfo.name || ""}
						onChange={(e) =>
							handleInputChange("name", e.target.value)
						}
						placeholder="姓名 *"
						className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] text-sm"
					/>
				</div>
			</div>
			<p className="text-xs text-[#6B7280] leading-relaxed">
				头像功能：点击左侧头像可实时上传/替换作者头像。作用范围：文章信息中的作者展示、右侧预览区、复制/分发内容中的作者头像。
			</p>

			{/* 邮箱 + 网站 */}
			<div className="grid grid-cols-2 gap-2">
				<div className="h-9 flex items-center gap-2 px-3 border border-[#CBD5E1] rounded-xl focus-within:ring-2 focus-within:ring-[#0F766E] focus-within:border-[#0F766E] bg-white">
					<AtSign className="h-4 w-4 text-[#64748B] shrink-0 self-center" />
					<input
						type="email"
						value={localInfo.email || ""}
						onChange={(e) =>
							handleInputChange("email", e.target.value)
						}
						placeholder="邮箱"
						className="w-full h-full min-w-0 p-0 text-sm leading-9 placeholder:leading-9 bg-transparent border-0 outline-none appearance-none focus:outline-none"
					/>
				</div>
				<div className="h-9 flex items-center gap-2 px-3 border border-[#CBD5E1] rounded-xl focus-within:ring-2 focus-within:ring-[#0F766E] focus-within:border-[#0F766E] bg-white">
					<Globe className="h-4 w-4 text-[#64748B] shrink-0 self-center" />
					<input
						type="url"
						value={localInfo.website || ""}
						onChange={(e) =>
							handleInputChange("website", e.target.value)
						}
						placeholder="网站"
						className="w-full h-full min-w-0 p-0 text-sm leading-9 placeholder:leading-9 bg-transparent border-0 outline-none appearance-none focus:outline-none"
					/>
				</div>
			</div>

			{/* 简介 */}
			<textarea
				value={localInfo.bio}
				onChange={(e) => handleInputChange("bio", e.target.value)}
				placeholder="简介..."
				rows={2}
				className="w-full px-3 py-2 border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] resize-none text-sm"
			/>

			{/* 社交平台 - 可展开 */}
			<div className="border border-[#CBD5E1] rounded-xl overflow-hidden">
				<button
					type="button"
					onClick={() => setShowSocial(!showSocial)}
					className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#0F172A] hover:bg-[#F7F4EC] transition-colors"
				>
					<span>
						社交平台
						{filledSocialCount > 0 && (
							<span className="ml-2 text-xs text-[#64748B]">
								({filledSocialCount})
							</span>
						)}
					</span>
					{showSocial ? (
						<ChevronUp className="h-4 w-4" />
					) : (
						<ChevronDown className="h-4 w-4" />
					)}
				</button>
				{showSocial && (
					<div className="px-3 pb-3 pt-1 space-y-2">
						<p className="text-xs text-[#64748B] leading-relaxed">
							用于展示作者社交信息（名片/页脚等）与模板变量替换，不会自动跳转抓取内容。可填写用户名、@账号或个人主页链接。
						</p>
							<div className="grid grid-cols-2 gap-x-3 gap-y-2">
							{SOCIAL_PLATFORMS.map(({ key, label, placeholder }) => (
								<div key={key} className="grid grid-rows-[20px_30px] items-center">
									<label className="block h-5 leading-5 text-xs text-[#64748B] font-medium">
										{label}
									</label>
									<input
										type="text"
										value={localInfo.socialLinks?.[key] || ""}
										onChange={(e) =>
											handleSocialChange(key, e.target.value)
										}
										placeholder={placeholder}
										className="w-full h-[30px] px-2.5 py-0 text-xs leading-[30px] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
									/>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* 重置按钮 */}
			<div className="flex justify-end">
				<Button
					onClick={handleReset}
					variant="outline"
					size="sm"
					className="border-[#CBD5E1] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A] rounded-xl"
				>
					<RotateCcw className="w-3.5 h-3.5 mr-1" />
					重置
				</Button>
			</div>
		</div>
	);
};
