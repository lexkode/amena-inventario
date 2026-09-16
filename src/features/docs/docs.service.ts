import { basename } from "node:path";

const docModules = import.meta.glob("/docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const MD_EXT = ".md";

export type DocMeta = {
  slug: string;
  title: string;
  description: string;
  index: number;
};

export type DocFile = DocMeta & {
  content: string;
  html: string;
};

function slugFromFile(filename: string): string {
  return basename(filename, MD_EXT).replace(/^\d+-/, "");
}

function titleFromContent(content: string): string {
  const firstHeading = content.match(/^#\s+(.+)$/m);
  if (firstHeading) return firstHeading[1].trim();
  return "Documentación";
}

function descriptionFromContent(content: string): string {
  const heading = content.match(/^##\s+(.+)$/m);
  const first = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith("#"));
  if (heading) return heading[1].trim();
  if (first) return first;
  return "";
}

function indexFromFilename(filename: string): number {
  const m = basename(filename, MD_EXT).match(/^(\d+)-/);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

export async function listDocs(): Promise<DocMeta[]> {
  const metas: DocMeta[] = [];

  for (const [filePath, content] of Object.entries(docModules)) {
    const filename = basename(filePath);
    if (!filename.endsWith(MD_EXT)) continue;
    metas.push({
      slug: slugFromFile(filename),
      title: titleFromContent(content),
      description: descriptionFromContent(content),
      index: indexFromFilename(filename),
    });
  }

  return metas.sort((a, b) => a.index - b.index);
}

export async function getDoc(slug: string): Promise<DocFile | null> {
  for (const [filePath, content] of Object.entries(docModules)) {
    const filename = basename(filePath);
    if (!filename.endsWith(MD_EXT)) continue;
    if (slugFromFile(filename) !== slug) continue;
    return {
      slug,
      title: titleFromContent(content),
      description: descriptionFromContent(content),
      index: indexFromFilename(filename),
      content,
      html: renderMarkdown(content),
    };
  }

  return null;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

function renderInline(text: string): string {
  const escaped = escapeHtml(text);

  const codeTokens: string[] = [];
  const noCode = escaped.replace(/`([^`]+)`/g, (_m, inner: string) => {
    codeTokens.push(`<code>${inner}</code>`);
    return `\u0000${codeTokens.length - 1}\u0000`;
  });

  const withBold = noCode.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  const withLinks = withBold.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  return withLinks.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codeTokens[Number(i)]);
}

function renderTable(rows: string[][]): string {
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  let html = '<div class="md-table"><table><thead><tr>';
  for (const cell of header) {
    html += `<th>${renderInline(cell.trim())}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (const row of body) {
    html += "<tr>";
    for (const cell of row) {
      html += `<td>${renderInline(cell.trim())}</td>`;
    }
    html += "</tr>";
  }

  html += "</tbody></table></div>";
  return html;
}

export function renderMarkdown(md: string): string {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];

  let i = 0;

  const pushBlock = (html: string) => {
    if (html) out.push(html);
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // skip closing fence
      const langAttr = lang ? ` class="language-${lang}"` : "";
      pushBlock(`<pre${langAttr}><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Heading
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      pushBlock(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^\s*---\s*$/.test(line)) {
      pushBlock("<hr />");
      i += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      pushBlock(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Table (line starting with | and next line is separator)
    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])
    ) {
      const rows: string[][] = [];
      const headerCells = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|");
      rows.push(headerCells);
      i += 2; // skip header + separator
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|");
        rows.push(cells);
        i += 1;
      }
      pushBlock(renderTable(rows));
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^\s*[-*]\s+/, "")));
        i += 1;
      }
      pushBlock(`<ul>${items.map((it) => `<li>${it}</li>`).join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(renderInline(lines[i].replace(/^\s*\d+\.\s+/, "")));
        i += 1;
      }
      pushBlock(`<ol>${items.map((it) => `<li>${it}</li>`).join("")}</ol>`);
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Paragraph (collect until blank line)
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^```/.test(lines[i])) {
      buf.push(lines[i].trim());
      i += 1;
    }
    pushBlock(`<p>${renderInline(buf.join(" "))}</p>`);
  }

  return out.join("\n");
}
