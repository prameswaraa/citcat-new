"use client";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Portal } from "@radix-ui/react-portal";
import React from "react";
import { links } from "@/components/header";

export function MobileNav() {
	const [open, setOpen] = React.useState(false);
	const { isMobile } = useMediaQuery();

	// 🚫 Disable body scroll when open
	React.useEffect(() => {
		if (open && isMobile) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		// Cleanup on unmount too
		return () => {
			document.body.style.overflow = "";
		};
	}, [open, isMobile]);

	return (
		<div className="md:hidden">
			<Button
				aria-controls="mobile-menu"
				aria-expanded={open}
				aria-label="Toggle menu"
				className="rounded-full border"
				onClick={() => setOpen(!open)}
				size="icon"
				variant="outline"
			>
				<div className="relative size-4">
					<span
						className={cn(
							"absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-200",
							open ? "-rotate-45 top-[0.4rem]" : "top-1"
						)}
					/>
					<span
						className={cn(
							"absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-200",
							open ? "top-[0.4rem] rotate-45" : "top-2.5"
						)}
					/>
				</div>
				<span className="sr-only">Toggle Menu</span>
			</Button>
			{open && (
				<Portal
					className={cn(
						"bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50 md:hidden",
						"fixed top-14 right-0 bottom-0 left-0 z-40 flex h-[calc(100vh-3.5rem)] flex-col overflow-y-auto"
					)}
				>
					<div
						className="data-[slot=open]:zoom-in-95 data-[state=closed]:zoom-out-95 px-4 pt-4 ease-out data-[slot=open]:animate-in data-[state=closed]:animate-out"
						data-slot={open ? "open" : "closed"}
					>
						<ul className="flex h-full w-full max-w-full flex-col items-start gap-y-4">
							{links.map((link) => (
								<li key={link.href}>
									<a className="font-medium text-xl" href={link.href}>
										{link.label}
									</a>
								</li>
							))}
						</ul>
						<a href="/login" className="w-full">
							<Button className="w-full rounded-full" variant="outline">
								Login
							</Button>
						</a>
					</div>
				</Portal>
			)}
		</div>
	);
}
