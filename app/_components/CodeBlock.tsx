"use client";

import { useState } from "react";
import { highlight } from "sugar-high";

const shTheme: Record<string, string> = {
  "var(--sh-class)": "#f9a8d4",
  "var(--sh-identifier)": "#ffffff",
  "var(--sh-sign)": "#737373",
  "var(--sh-property)": "#7dd3fc",
  "var(--sh-entity)": "#c084fc",
  "var(--sh-jsxliterals)": "#c084fc",
  "var(--sh-string)": "#4ade80",
  "var(--sh-keyword)": "#c084fc",
  "var(--sh-comment)": "#525252",
};

export function CodeBlock({
  code,
  label,
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  let html = highlight(code);
  for (const [token, color] of Object.entries(shTheme)) {
    html = html.replaceAll(token, color);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group rounded-xl border border-[#222] hover:border-[#444] transition-colors overflow-hidden bg-[#0f0f0f]">
      {label && (
        <div className="px-4 py-2.5 border-b border-[#222] flex items-center justify-between">
          <span className="font-mono text-xs text-neutral-500">{label}</span>
        </div>
      )}
      <pre className="p-4 font-mono text-xs md:text-sm leading-relaxed overflow-x-auto">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
      <div className="flex justify-end px-3 py-2 bg-[#0a0a0a] border-t border-[#222]">
        <button
          className="text-neutral-600 hover:text-neutral-400 transition-colors focus:outline-none focus:ring-1 focus:ring-neutral-500 rounded"
          aria-label={copied ? "Copied" : "Copy code"}
          onClick={handleCopy}
        >
          {copied ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                d="M20 6L9 17l-5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path
                d="M9 9h10v10H9V9Zm-4 6H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
