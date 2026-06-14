"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.42 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Left: the pitch */}
      <section className="flex flex-col justify-between px-8 py-10 lg:px-16">
        <div className="flex items-center gap-2 text-sm text-cloud-muted">
          <span className="h-2 w-2 rounded-full bg-ember" />
          Channel Analytics
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-cloud lg:text-5xl">
            Your channel,
            <br />
            read like an instrument.
          </h1>
          <p className="mt-5 text-cloud-muted">
            Sign in with the Google account that owns your YouTube channel.
            We read your analytics — views, watch time, audience, retention —
            and let you pull any of it into a spreadsheet. We never see your
            password; Google handles sign-in.
          </p>

          <div className="mt-8">
            <Button
              size="md"
              variant="outline"
              className="bg-white text-[#1f1f1f] hover:bg-white/90"
              onClick={() => signIn("google", { callbackUrl: "/channels" })}
            >
              <GoogleMark />
              Sign in with Google
            </Button>
          </div>

          <p className="mt-4 text-xs text-cloud-faint">
            Read-only access. You can revoke it any time from your Google
            account settings.
          </p>
        </div>

        <p className="text-xs text-cloud-faint">
          Not affiliated with YouTube or Google.
        </p>
      </section>

      {/* Right: a quiet data motif */}
      <aside className="relative hidden overflow-hidden border-l border-ink-line bg-ink-panel lg:block">
        <div className="absolute inset-0 flex items-end p-12">
          <div className="grid w-full grid-cols-12 items-end gap-2">
            {[
              28, 40, 33, 52, 47, 61, 55, 70, 64, 78, 72, 90,
            ].map((h, i) => (
              <div
                key={i}
                className="rounded-t bg-gradient-to-t from-ember/10 to-ember/60"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
        <div className="absolute left-12 top-12 font-mono text-xs text-cloud-faint tnum">
          <div>views ↑ 18.4%</div>
          <div className="mt-1">watch time ↑ 22.1%</div>
          <div className="mt-1">subs ↑ 1,204</div>
        </div>
      </aside>
    </main>
  );
}
