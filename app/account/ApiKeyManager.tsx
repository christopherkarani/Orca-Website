"use client";

import { useState } from "react";
import type { AccountApiKeyRecord } from "@/lib/server/store";

export function ApiKeyManager({ initialKeys }: { initialKeys: AccountApiKeyRecord[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createKey() {
    setBusy(true);
    try {
      const response = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { accept: "application/json" },
      });
      if (!response.ok) return;
      const body = (await response.json()) as {
        rawKey: string;
        key: AccountApiKeyRecord;
      };
      setRawKey(body.rawKey);
      setKeys((current) => [body.key, ...current]);
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(keyId: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/account/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { accept: "application/json" },
      });
      if (!response.ok) return;
      setKeys((current) =>
        current.map((key) =>
          key.id === keyId ? { ...key, revokedAt: new Date().toISOString() } : key
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 space-y-4">
      {rawKey && (
        <div className="border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-950">Copy this API key now.</p>
          <p className="mt-1 text-xs text-amber-900">
            Orca stores only a hash and cannot show it again.
          </p>
          <pre className="mt-3 overflow-x-auto bg-white p-3 text-xs text-neutral-950">
            {rawKey}
          </pre>
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={createKey}
        className="border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
      >
        Create API key
      </button>
      <div className="divide-y divide-neutral-200 border border-neutral-200">
        {keys.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">No API keys yet.</p>
        ) : (
          keys.map((key) => (
            <div key={key.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-950">{key.name}</p>
                <p className="mt-1 font-mono text-xs text-neutral-500">
                  {key.keyPrefix}...{key.keyLast4}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {key.revokedAt ? "Revoked" : key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString("en-US")}` : "Never used"}
                </p>
              </div>
              {!key.revokedAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => revokeKey(key.id)}
                  className="border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-50"
                >
                  Revoke
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
