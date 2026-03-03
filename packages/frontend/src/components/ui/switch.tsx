"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
	className,
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	const isChecked = props.checked === true;

	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer relative inline-flex h-5 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-sm transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[#6b7280] data-[state=unchecked]:bg-[#9ca3af]",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out will-change-transform",
				)}
				style={{
					transform: `translateX(${isChecked ? 22 : 2}px)`,
				}}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
