"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  title: string;
  thumbnail: string | null;
  subscriberCount: string;
  videoCount: string;
  viewCount: string;
}

function compact(n: string) {
  const num = Number(n);
  if (!Number.isFinite(num)) return n;
  return new Intl.NumberFormat("en", { notation: "compact" }).format(num);
}

export default function ChannelsPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/channels")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load channels.");
        return data.channels as Channel[];
      })
      .then((list) => {
        if (!active) return;
        // Skip the picker when there's exactly one channel.
        if (list.length === 1) {
          router.replace(`/dashboard/${list[0].id}`);
          return;
        }
        setChannels(list);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <Shell>
        <Card className="p-6">
          <p className="text-cloud">Something went wrong</p>
          <p className="mt-1 text-sm text-cloud-muted">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign in again
          </Button>
        </Card>
      </Shell>
    );
  }

  if (!channels) {
    return (
      <Shell>
        <p className="text-cloud-muted">Loading your channels…</p>
      </Shell>
    );
  }

  if (channels.length === 0) {
    return (
      <Shell>
        <Card className="p-6">
          <p className="text-cloud">No channel found</p>
          <p className="mt-1 text-sm text-cloud-muted">
            This Google account doesn’t have a YouTube channel associated with
            it. Switch accounts and try again.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Use a different account
          </Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-cloud">
          Choose a channel
        </h1>
        <p className="mt-1 text-sm text-cloud-muted">
          You manage {channels.length} channels. Pick one to open its
          dashboard.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {channels.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/dashboard/${c.id}`)}
            className="group text-left"
          >
            <Card className="flex items-center gap-4 p-4 transition-colors group-hover:border-cloud-faint">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.thumbnail ?? ""}
                alt=""
                className="h-14 w-14 rounded-full bg-ink-raised object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-cloud">{c.title}</p>
                <p className="mt-0.5 font-mono text-xs text-cloud-muted tnum">
                  {compact(c.subscriberCount)} subs ·{" "}
                  {compact(c.videoCount)} videos · {compact(c.viewCount)} views
                </p>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-cloud-muted">
          <span className="h-2 w-2 rounded-full bg-ember" />
          Channel Analytics
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Sign out
        </Button>
      </div>
      {children}
    </main>
  );
}
