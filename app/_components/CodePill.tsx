"use client";

import { useState } from "react";

export function CodePill({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group rounded-xl border border-[#222] hover:border-[#444] transition-colors overflow-hidden">
      {label && (
        <div className="px-4 py-2 border-b border-[#222] bg-[#0a0a0a]">
          <span className="font-mono text-xs text-neutral-500">{label}</span>
        </div>
      )}
      <pre className="bg-[#111] font-mono text-sm text-white overflow-x-auto">
        <code className="block p-4 leading-relaxed">{text}</code>
      </pre>
      <div className="flex justify-end px-3 py-2 bg-[#0a0a0a] border-t border-[#222]">
        <button
          className="text-neutral-600 hover:text-neutral-400 transition-colors focus:outline-none"
          aria-label="Copy code"
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
