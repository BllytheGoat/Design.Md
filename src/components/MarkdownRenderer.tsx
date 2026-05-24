import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy markdown text", err);
    }
  };

  // Safe custom Markdown-to-HTML formatter to render text clearly with perfect Tailwind margins and line heights
  const renderFormattedMarkdown = (rawText: string) => {
    if (!rawText) return null;

    const lines = rawText.split("\n");
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLanguage = "";
    
    let inTable = false;
    let tableRows: string[][] = [];

    const elements: React.ReactNode[] = [];

    // Helper to flush current table buffer
    const flushTable = (keyIndex: number) => {
      if (tableRows.length === 0) return;
      const headers = tableRows[0];
      const bodies = tableRows.slice(1);
      
      elements.push(
        <div key={`table-${keyIndex}`} className="my-6 overflow-x-auto border border-black/10 rounded-lg">
          <table className="w-full text-left text-xs font-serif border-collapse">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-black/10">
                {headers.map((cell, idx) => (
                  <th key={`th-${idx}`} className="px-4 py-3 font-sans font-bold uppercase tracking-wider text-black/75">
                    {parseInlineMarkdown(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodies.map((row, rowIdx) => (
                <tr key={`tr-${rowIdx}`} className="border-b border-black/5 hover:bg-black/[0.01] transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={`td-${cellIdx}`} className="px-4 py-3 text-black/85 leading-relaxed">
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks bypass anything else
      if (line.trim().startsWith("```")) {
        if (inTable) flushTable(i);
        if (inCodeBlock) {
          inCodeBlock = false;
          const codeText = codeContent.join("\n");
          elements.push(
            <div key={`code-block-${i}`} className="my-6 overflow-hidden border border-black/10 bg-[#121212] font-mono text-xs text-gray-200 shadow-sm rounded-lg">
              <div className="flex items-center justify-between bg-black/80 px-4 py-2 border-b border-white/5">
                <span className="text-[9px] font-sans font-bold tracking-widest text-gray-400 uppercase">
                  {codeLanguage || "source"}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(codeText)}
                  className="p-1 px-2 text-[9px] font-sans uppercase tracking-widest bg-white/5 hover:bg-white/15 text-gray-300 rounded cursor-pointer transition-colors"
                  title="Copy block"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto select-all leading-relaxed text-gray-300">
                <code>{codeText}</code>
              </pre>
            </div>
          );
          codeContent = [];
        } else {
          inCodeBlock = true;
          codeLanguage = line.replace("```", "").trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Handle Markdown tables
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        const isSpacer = line.includes("---") || line.includes("===");
        if (!isSpacer) {
          const rawCells = line.split("|");
          const cleanedCells = rawCells
            .slice(1, rawCells.length - 1)
            .map(c => c.trim());
          tableRows.push(cleanedCells);
        }
        inTable = true;
        continue;
      } else if (inTable) {
        flushTable(i);
      }

      // Headers
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={i} className="mt-8 mb-5 text-3xl font-black tracking-tight text-[#121212] border-b border-black/10 pb-3 italic font-serif">
            {line.replace("# ", "")}
          </h1>
        );
        continue;
      }
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className="mt-8 mb-4 text-xl font-bold tracking-tight text-[#121212] border-l-2 border-black pl-3 font-serif italic">
            {line.replace("## ", "")}
          </h2>
        );
        continue;
      }
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={i} className="mt-6 mb-3 text-md font-semibold text-[#121212] font-serif">
            {line.replace("### ", "")}
          </h3>
        );
        continue;
      }

      // Blockquotes
      if (line.startsWith("> ")) {
        elements.push(
          <blockquote key={i} className="my-5 border-l-4 border-black pl-4 py-1.5 italic text-[#121212]/85 bg-black/[0.03] pr-4">
            {parseInlineMarkdown(line.substring(2))}
          </blockquote>
        );
        continue;
      }

      // Unordered Lists
      if (line.startsWith("- ") || line.startsWith("* ")) {
        elements.push(
          <ul key={i} className="list-disc pl-6 my-2.5 text-[#121212]/90 leading-relaxed text-sm font-serif">
            <li className="pl-1">
              {parseInlineMarkdown(line.substring(2))}
            </li>
          </ul>
        );
        continue;
      }

      // Ordered Lists
      const numberedListRegex = /^(\d+)\.\s(.*)/;
      if (numberedListRegex.test(line)) {
        const match = line.match(numberedListRegex);
        if (match) {
          elements.push(
            <ol key={i} className="list-decimal pl-6 my-2.5 text-[#121212]/90 leading-relaxed text-sm font-serif">
              <li className="pl-1">
                {parseInlineMarkdown(match[2])}
              </li>
            </ol>
          );
          continue;
        }
      }

      // Dividers
      if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
        elements.push(<hr key={i} className="my-8 border-t border-black/10" />);
        continue;
      }

      // Empty lines
      if (!line.trim()) {
        continue;
      }

      // Regular Paragraphs
      elements.push(
        <p key={i} className="my-4 text-sm text-[#121212]/90 leading-relaxed font-serif text-pretty">
          {parseInlineMarkdown(line)}
        </p>
      );
    }

    if (inTable) {
      flushTable(lines.length);
    }

    return elements;
  };

  // Basic matcher for inline stars **bold** and `code` markers
  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIdx = 0;

    // Matches **bold** or `code` pattern
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchText = match[0];

      // Any text prior to the match
      if (matchStart > currentIdx) {
        parts.push(text.substring(currentIdx, matchStart));
      }

      // Process matched formats
      if (matchText.startsWith("**") && matchText.endsWith("**")) {
        parts.push(
          <strong key={matchStart} className="font-bold text-[#121212]">
            {matchText.slice(2, -2)}
          </strong>
        );
      } else if (matchText.startsWith("`") && matchText.endsWith("`")) {
        parts.push(
          <code key={matchStart} className="px-1.5 py-0.5 rounded bg-black/5 font-mono text-[11px] text-red-750 border border-black/5">
            {matchText.slice(1, -1)}
          </code>
        );
      }

      currentIdx = regex.lastIndex;
    }

    // Remaining text
    if (currentIdx < text.length) {
      parts.push(text.substring(currentIdx));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="bg-[#EBE8E0] p-6 md:p-12 rounded-3xl border border-black/5 shadow-sm min-h-[500px]">
      <div className="relative bg-white shadow-[40px_40px_80px_-40px_rgba(0,0,0,0.1)] p-8 md:p-16 border border-black/5 overflow-hidden rounded-2xl">
        {/* Editorial watermarked serial tag */}
        <div className="absolute top-0 right-0 p-8 text-[64px] text-black/[0.03] font-serif leading-none select-none italic font-black">
          MD
        </div>

        {/* Copy trigger box */}
        <div className="flex justify-between items-center mb-8 pb-3 border-b border-black/5">
          <span className="font-sans text-[10px] uppercase tracking-[0.3em] opacity-40">
            Preview: blueprint.md
          </span>
          <button
            onClick={handleCopy}
            className="font-sans text-[10px] uppercase tracking-widest border border-black px-5 py-2 bg-transparent hover:bg-black hover:text-white transition-all cursor-pointer active:scale-95"
          >
            {copied ? "Copied Spec!" : "Download .md Code"}
          </button>
        </div>

        {/* Render formatting markup */}
        <div className="max-w-none pr-4 md:pr-12">
          {renderFormattedMarkdown(content)}
        </div>
      </div>
    </div>
  );
}

