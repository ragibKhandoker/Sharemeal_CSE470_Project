import React, { useState } from 'react';

/**
 * Minimal Markdown renderer for assistant answers: headings, paragraphs,
 * lists, tables, fenced code blocks and inline bold/italic/code/links.
 * Builds React elements only (no HTML injection). In-app paths such as
 * `/receiver/wallet` become clickable via `onNavigate`.
 */

const APP_PATH = /^\/(receiver|donor|ngo|admin)(\/[a-z0-9-]+)*\/?$/i;

const CodeBlock = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div style={{ margin: '8px 0', borderRadius: 10, overflow: 'hidden', background: '#0f172a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 10px', background: '#1e293b', color: '#94a3b8', fontSize: 11 }}>
        <span>{lang || 'code'}</span>
        <button type="button" onClick={copy} style={{ border: 0, background: 'transparent', color: '#cbd5e1', fontSize: 11, cursor: 'pointer' }}>{copied ? 'Copied ✓' : 'Copy'}</button>
      </div>
      <pre style={{ margin: 0, padding: '10px 12px', overflowX: 'auto', color: '#e2e8f0', fontSize: 12, lineHeight: 1.5 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const renderInline = (text, onNavigate, keyPrefix = 'i') => {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\s\n][^*\n]*\*|_[^_\s\n][^_\n]*_)/g;
  const nodes = [];
  let last = 0;
  let match;
  let index = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index += 1}`;
    if (token.startsWith('`')) {
      const code = token.slice(1, -1);
      nodes.push(APP_PATH.test(code) && onNavigate
        ? <button key={key} type="button" onClick={() => onNavigate(code)} style={{ border: 0, padding: '0 4px', borderRadius: 4, background: '#dbeafe', color: '#1d4ed8', fontFamily: 'monospace', fontSize: '0.92em', cursor: 'pointer' }}>{code}</button>
        : <code key={key} style={{ padding: '1px 5px', borderRadius: 4, background: '#eef2f7', fontSize: '0.92em' }}>{code}</code>);
    } else if (token.startsWith('**') || token.startsWith('__')) {
      nodes.push(<strong key={key}>{renderInline(token.slice(2, -2), onNavigate, key)}</strong>);
    } else if (token.startsWith('[')) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (APP_PATH.test(href) && onNavigate) {
        nodes.push(<button key={key} type="button" onClick={() => onNavigate(href)} style={{ border: 0, padding: 0, background: 'transparent', color: '#1d4ed8', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>{label}</button>);
      } else if (/^https?:\/\//i.test(href)) {
        nodes.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>{label}</a>);
      } else {
        nodes.push(label);
      }
    } else {
      nodes.push(<em key={key}>{renderInline(token.slice(1, -1), onNavigate, key)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

const splitRow = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());

export default function ChatMarkdown({ text, onNavigate }) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b-${i}`;

    const fence = /^\s*```\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      const code = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or end of a still-streaming answer)
      blocks.push(<CodeBlock key={key} code={code.join('\n')} lang={fence[1]} />);
      continue;
    }

    if (!line.trim()) { i += 1; continue; }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const size = [17, 16, 15, 14][heading[1].length - 1];
      blocks.push(<div key={key} style={{ fontWeight: 800, fontSize: size, margin: '10px 0 4px' }}>{renderInline(heading[2], onNavigate, key)}</div>);
      i += 1;
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const header = splitRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push(
        <div key={key} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
            <thead><tr>{header.map((cell, c) => <th key={c} style={{ border: '1px solid #e2e8f0', padding: '5px 7px', background: '#f1f5f9', textAlign: 'left' }}>{renderInline(cell, onNavigate, `${key}h${c}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} style={{ border: '1px solid #e2e8f0', padding: '5px 7px', verticalAlign: 'top' }}>{renderInline(cell, onNavigate, `${key}r${r}c${c}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    const listItem = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/;
    if (listItem.test(line)) {
      const ordered = /\d/.test(listItem.exec(line)[2]);
      const items = [];
      while (i < lines.length && listItem.test(lines[i])) {
        const [, indent, marker, content] = listItem.exec(lines[i]);
        if (/\d/.test(marker) !== ordered && indent.length === 0) break;
        items.push({ content, nested: indent.length >= 2 });
        i += 1;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={key} style={{ margin: '4px 0', paddingLeft: 20 }}>
          {items.map((item, n) => (
            <li key={n} style={{ margin: '2px 0', marginLeft: item.nested ? 14 : 0, listStyleType: item.nested ? 'circle' : undefined }}>
              {renderInline(item.content, onNavigate, `${key}-${n}`)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    const paragraph = [lines[i].replace(/^>\s?/, '')];
    i += 1;
    while (
      i < lines.length && lines[i].trim() &&
      !/^\s*```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !listItem.test(lines[i])
    ) {
      paragraph.push(lines[i].replace(/^>\s?/, ''));
      i += 1;
    }
    blocks.push(
      <p key={key} style={{ margin: '4px 0' }}>
        {paragraph.map((part, n) => (
          <React.Fragment key={n}>{n > 0 && <br />}{renderInline(part, onNavigate, `${key}-${n}`)}</React.Fragment>
        ))}
      </p>
    );
  }

  return <div style={{ overflowWrap: 'anywhere' }}>{blocks}</div>;
}
