import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="min-h-screen bg-white px-4 py-16 text-black">
        <section className="mx-auto max-w-md border border-neutral-200 p-6">
          <p className="font-mono text-xs tracking-[0.2em] text-neutral-400 mb-4">
            ACCOUNT ACCESS
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign-in is not configured</h1>
          <p className="mt-3 text-sm text-neutral-500">
            Clerk production keys must be configured before account access is available.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white px-4 py-16 text-black">
      <div className="mx-auto flex max-w-md justify-center">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
      </div>
    </main>
  );
}
