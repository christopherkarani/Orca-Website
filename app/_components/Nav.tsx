"use client";

import Link from "next/link";

const GITHUB_URL = "https://github.com/christopherkarani/Orca";

export function Nav() {
  return (
    <nav
      className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm border-b border-neutral-100"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto max-w-5xl flex items-center justify-between px-6 py-4 md:px-8">
        <Link
          href="/"
          className="font-medium tracking-[0.2em] text-sm uppercase text-neutral-900 hover:tracking-[0.25em] transition-all"
          aria-label="Orca home"
        >
          orca
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/docs"
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Docs
          </Link>
          <Link
            href={GITHUB_URL}
            className="group inline-flex items-center justify-center bg-black text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            GitHub
          </Link>
        </div>
      </div>
    </nav>
  );
}
