import Link from "next/link";

const GITHUB_URL = "https://github.com/christopherkarani/Orca";

export function Footer() {
  return (
    <footer className="border-t border-neutral-100 py-12" role="contentinfo">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-xs text-neutral-400">&copy; 2026 Orca</p>
          <div className="flex items-center gap-6 text-xs text-neutral-400">
            <Link href="/pricing" className="hover:text-neutral-600 transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-neutral-600 transition-colors">
              Documentation
            </Link>
            <Link href="/account" className="hover:text-neutral-600 transition-colors">
              Account
            </Link>
            <Link
              href={GITHUB_URL}
              className="hover:text-neutral-600 transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
