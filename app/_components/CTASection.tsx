import Link from "next/link";

const GITHUB_URL = "https://github.com/christopherkarani/Orca";

export function CTASection() {
  return (
    <section className="fade-in border-t border-neutral-100">
      <div className="mx-auto max-w-5xl px-4 md:px-8 py-20 md:py-28 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
          Ready to secure your agents?
        </h2>
        <p className="text-neutral-500 text-base md:text-lg max-w-lg mx-auto mb-10">
          Get started with Orca in minutes. Open source, local-first, and built for the
          agent ecosystem.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/docs#install"
            className="group inline-flex items-center justify-center bg-black text-white rounded-full px-8 py-3 text-sm font-medium hover:bg-neutral-800 transition-colors w-full sm:w-auto"
          >
            Installation Guide{" "}
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
          </Link>
          <Link
            href={GITHUB_URL}
            className="group inline-flex items-center justify-center border border-neutral-300 text-neutral-900 rounded-full px-8 py-3 text-sm font-medium hover:bg-neutral-100 transition-colors w-full sm:w-auto"
          >
            GitHub Repository{" "}
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
          </Link>
          <Link
            href="/docs#quickstart"
            className="group inline-flex items-center justify-center border border-neutral-300 text-neutral-900 rounded-full px-8 py-3 text-sm font-medium hover:bg-neutral-100 transition-colors w-full sm:w-auto"
          >
            Quick-Start Tutorial{" "}
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
          </Link>
        </div>

      </div>
    </section>
  );
}
