import React, { ReactNode } from "react";

interface ScrollContainerProps {
	children: ReactNode;
	className?: string;
	style?: React.CSSProperties;
	tabIndex?: number;
	onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
	onWheel?: React.WheelEventHandler<HTMLDivElement>;
	onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
	onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * 滚动容器组件
 * 使用React.memo优化，但正常比较props
 */
export const ScrollContainer = React.memo(
	React.forwardRef<HTMLDivElement, ScrollContainerProps>(
		(
			{
				children,
				className,
				style,
				tabIndex,
				onKeyDown,
				onWheel,
				onMouseEnter,
				onMouseDown,
			},
			ref,
		) => {
			return (
				<div
					ref={ref}
					className={className}
					style={style}
					tabIndex={tabIndex}
					onKeyDown={onKeyDown}
					onWheel={onWheel}
					onMouseEnter={onMouseEnter}
					onMouseDown={onMouseDown}
				>
					{children}
				</div>
			);
		},
	),
);

ScrollContainer.displayName = "ScrollContainer";
