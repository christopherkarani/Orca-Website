"use client";

import { useState } from "react";

export function LicenseCopyButton({ licenseKey }: { licenseKey: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(licenseKey);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
    >
      {copied ? "Copied" : "Copy license"}
    </button>
  );
}
