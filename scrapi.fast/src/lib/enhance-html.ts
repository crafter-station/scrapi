export function enhanceHTMLReadability(
  htmlString: string | object | undefined,
): string | object {
  if (typeof htmlString !== "string") return htmlString;

  const maxLineLength = 120;
  let html = htmlString;
  html = html.replace(/></g, ">\n<");

  // 2. Formatear scripts minificados para mejor legibilidad
  html = html.replace(
    /<script([^>]*)>([\s\S]*?)<\/script>/gi,
    (match, attrs, content) => {
      if (!content || content.trim().length === 0) return match;

      let formatted = content;
      const trimmed = content.trim();

      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          formatted = JSON.stringify(parsed, null, 2);
          return `<script${attrs}>\n${formatted}\n</script>`;
        } catch {
          // Not valid JSON, continue with other formatting
        }
      }

      if (!content.includes("\n") && content.length > 100) {
        formatted = formatted.replace(/;/g, ";\n    ");
        formatted = formatted.replace(/{/g, "{\n      ");
        formatted = formatted.replace(/}/g, "\n    }\n    ");
        formatted = formatted.replace(/\n\s*\n/g, "\n");
        formatted = formatted.trim();
      }

      formatted = splitLongLines(formatted, maxLineLength);

      return `<script${attrs}>\n    ${formatted.trim()}\n  </script>`;
    },
  );

  // 3. Formatear CSS inline para mejor legibilidad
  html = html.replace(
    /<style([^>]*)>([\s\S]*?)<\/style>/gi,
    (match, attrs, content) => {
      if (content && !content.includes("\n") && content.length > 100) {
        let formatted = content;
        formatted = formatted.replace(/}/g, "}\n    ");
        formatted = formatted.replace(/{/g, "{\n      ");
        formatted = formatted.replace(/;/g, ";\n      ");
        formatted = formatted.replace(/\n\s*\n/g, "\n");
        formatted = splitLongLines(formatted, maxLineLength);
        return `<style${attrs}>\n    ${formatted.trim()}\n  </style>`;
      }
      return match;
    },
  );

  // 4. Formatear atributos largos en múltiples líneas
  html = html.replace(/<(\w+)([^>]{100,})>/g, (match, tag, attrs) => {
    const formattedAttrs = attrs.trim().replace(/\s+(\w+)=/g, "\n      $1=");
    return `<${tag}${formattedAttrs}>`;
  });

  // 5. Format JSON in data attributes
  html = html.replace(
    /data-([a-z-]+)="(\{[^"]+\})"/gi,
    (match, name, jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        const formatted = JSON.stringify(parsed, null, 2)
          .split("\n")
          .map((line, i) => (i === 0 ? line : "      " + line))
          .join("\n");
        return `data-${name}="${formatted}"`;
      } catch {
        return match;
      }
    },
  );

  // 6. Decodificar entidades HTML comunes para mejor legibilidad
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#x60;": "`",
    "&#x3D;": "=",
  };

  for (const [entity, char] of Object.entries(entities)) {
    html = html.replace(new RegExp(`>${entity}<`, "g"), `>${char}<`);
  }

  // 7. Agregar comentarios de sección para mejorar navegación
  html = html.replace(
    /(<head[^>]*>)/i,
    "$1\n  <!-- ========== HEAD SECTION ========== -->",
  );
  html = html.replace(
    /(<body[^>]*>)/i,
    "$1\n  <!-- ========== BODY SECTION ========== -->",
  );
  html = html.replace(/(<nav[^>]*>)/gi, "<!-- Navigation -->\n  $1");
  html = html.replace(/(<header[^>]*>)/gi, "<!-- Header -->\n  $1");
  html = html.replace(/(<main[^>]*>)/gi, "<!-- Main Content -->\n  $1");
  html = html.replace(/(<footer[^>]*>)/gi, "<!-- Footer -->\n  $1");
  html = html.replace(/(<aside[^>]*>)/gi, "<!-- Sidebar -->\n  $1");

  // 8. Simplificar data URLs largos
  html = html.replace(
    /data:image\/[^;]+;base64,[A-Za-z0-9+\/]{200,}={0,2}/g,
    "data:image/[base64-truncated]",
  );

  // 9. Organizar atributos meta para mejor legibilidad
  html = html.replace(/<meta([^>]+)>/gi, (match, attrs) => {
    if ((attrs.match(/="/g) || []).length > 2) {
      const formatted = attrs.trim().replace(/\s+(\w+)=/g, "\n      $1=");
      return `<meta${formatted}>`;
    }
    return match;
  });

  // 10. Aplicar indentación apropiada
  html = applyIndentation(html);

  // 11. Agregar DOCTYPE si no existe
  if (!html.trim().toLowerCase().startsWith("<!doctype")) {
    html = "<!DOCTYPE html>\n" + html;
  }

  // 12. Asegurar que tiene meta charset
  if (!html.includes("charset") && html.includes("<head")) {
    html = html.replace(/(<head[^>]*>)/i, '$1\n  <meta charset="UTF-8">');
  }

  // 13. Remover líneas vacías múltiples
  html = html.replace(/\n{3,}/g, "\n\n");

  // 14. Final pass: split any remaining long lines
  html = splitLongLines(html, maxLineLength);

  return html;
}

function splitLongLines(text: string, maxLength: number): string {
  return text
    .split("\n")
    .map((line) => {
      if (line.length <= maxLength) return line;

      const indent = line.match(/^(\s*)/)?.[1] || "";
      const content = line.slice(indent.length);
      const chunks: string[] = [];
      let current = "";

      const splitPoints = [",", ";", "&&", "||", " ", ":", "{", "}", "(", ")"];

      let i = 0;
      while (i < content.length) {
        current += content[i];

        if (current.length >= maxLength - indent.length) {
          let splitAt = -1;
          for (const point of splitPoints) {
            const lastIdx = current.lastIndexOf(point);
            if (lastIdx > maxLength / 3) {
              splitAt = lastIdx + point.length;
              break;
            }
          }

          if (splitAt === -1) {
            splitAt = maxLength - indent.length;
          }

          chunks.push(current.slice(0, splitAt));
          current = current.slice(splitAt);
        }
        i++;
      }

      if (current) {
        chunks.push(current);
      }

      return chunks
        .map((chunk, idx) =>
          idx === 0 ? indent + chunk : indent + "  " + chunk,
        )
        .join("\n");
    })
    .join("\n");
}

function applyIndentation(html: string) {
  const lines = html.split("\n");
  const indentedLines = [];
  let indentLevel = 0;
  const indentSize = 2;
  const indent = " ";

  const selfClosingTags = new Set([
    "meta",
    "link",
    "img",
    "input",
    "br",
    "hr",
    "area",
    "base",
    "col",
    "embed",
    "source",
    "track",
    "wbr",
  ]);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      indentedLines.push("");
      continue;
    }

    if (trimmedLine.startsWith("</")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    indentedLines.push(indent.repeat(indentLevel * indentSize) + trimmedLine);

    const openTagMatch = trimmedLine.match(/^<([a-zA-Z]+)/);
    if (openTagMatch) {
      const tagName = openTagMatch[1].toLowerCase();

      if (
        !selfClosingTags.has(tagName) &&
        !trimmedLine.endsWith("/>") &&
        !trimmedLine.includes(`</${tagName}`)
      ) {
        indentLevel++;
      }
    }

    if (trimmedLine.startsWith("<!--") && !trimmedLine.endsWith("-->")) {
      indentLevel++;
    }

    if (trimmedLine.endsWith("-->") && !trimmedLine.startsWith("<!--")) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
  }

  return indentedLines.join("\n");
}
