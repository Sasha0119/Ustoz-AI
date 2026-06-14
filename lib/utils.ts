export function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

export function stripJson(s: string): string {
  // Extract JSON from code blocks anywhere in the string (LLMs often add preamble text)
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  // Fall back to extracting the first JSON object or array literal
  const raw = s.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (raw) return raw[1].trim();
  return s.trim();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Render mixed prose + fenced code into safe HTML: code fences become styled
// <pre> blocks, and the text between them is escaped and kept as readable
// paragraphs (so multi-example explanations don't render as one raw blob).
export function renderCode(text: string): string {
  const re = /```[^\n]*\n?([\s\S]*?)```/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(last, m.index).trim();
    if (before) out += `<p class="explain-para">${escapeHtml(before)}</p>`;
    out += `<pre class="code-block"><code>${escapeHtml(m[1].trim())}</code></pre>`;
    last = re.lastIndex;
  }
  const after = text.slice(last).trim();
  if (after) out += `<p class="explain-para">${escapeHtml(after)}</p>`;
  return out;
}
