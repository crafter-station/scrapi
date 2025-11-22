"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { createCssVariablesTheme } from "shiki/core";
import { cn } from "@/lib/utils";

const cssVariablesTheme = createCssVariablesTheme({
	name: "css-variables",
	variablePrefix: "--shiki-",
	variableDefaults: {},
	fontStyle: true,
});

interface CodeViewerProps {
	code: string;
	lang: string;
	className?: string;
}

export function CodeViewer({ code, lang, className }: CodeViewerProps) {
	const [html, setHtml] = useState<string>("");

	useEffect(() => {
		codeToHtml(code, {
			lang,
			themes: {
				light: cssVariablesTheme,
				dark: cssVariablesTheme,
			},
			defaultColor: false,
		}).then(setHtml);
	}, [code, lang]);

	if (!html) {
		return (
			<div className={cn("animate-pulse rounded-lg bg-muted/50 h-32", className)} />
		);
	}

	return (
		<div
			className={cn("overflow-auto", className)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
