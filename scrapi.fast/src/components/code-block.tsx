import { codeToHtml } from "shiki";
import { createCssVariablesTheme } from "shiki/core";

const cssVariablesTheme = createCssVariablesTheme({
  name: "css-variables",
  variablePrefix: "--shiki-",
  variableDefaults: {},
  fontStyle: true,
});

interface CodeBlockProps {
  code: string;
  lang?: string;
  className?: string;
}

export async function CodeBlock({
  code,
  lang = "javascript",
  className = "",
}: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang,
    themes: {
      light: cssVariablesTheme,
      dark: cssVariablesTheme,
    },
    defaultColor: false,
  });

  return (
    <div
      className={`overflow-x-auto rounded-lg border ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
