"use client";

import { NavHeader } from "@/components/NavHeader";
import { useState, useEffect } from "react";

interface Settings {
  obsidianVaultPath: string | null;
  theme: string;
  notificationFrequency: string;
  timezone: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [vaultPath, setVaultPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.settings) {
          setSettings(res.data.settings);
          setVaultPath(res.data.settings.obsidianVaultPath || "");
        }
      });
  }, []);

  async function saveVaultPath() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          obsidianVaultPath: vaultPath.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.data.settings);
        const synced = data.data.reflectionsSynced;
        const syncMsg = synced > 0 ? ` — synced ${synced} existing reflection${synced > 1 ? "s" : ""}` : "";
        setMessage({ type: "success", text: `Vault path saved${syncMsg}` });
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to save" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-xl px-xl py-xl">
      <NavHeader activePage="settings" />

      <section>
        <h2 className="mb-lg">[SETTINGS]</h2>

        <div className="flex flex-col gap-xl">
          <div className="border border-border p-lg">
            <h3 className="mb-md text-xs">PREFERENCES</h3>
            <div className="flex flex-col gap-md text-sm">
              <div className="flex items-center justify-between">
                <span>Theme</span>
                <span className="text-xs text-muted">{settings?.theme || "LIGHT"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Notification frequency</span>
                <span className="text-xs text-muted">{settings?.notificationFrequency || "WEEKLY"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Timezone</span>
                <span className="text-xs text-muted">{settings?.timezone || "UTC"}</span>
              </div>
            </div>
          </div>

          <div className="border border-border p-lg">
            <h3 className="mb-md text-xs">OBSIDIAN INTEGRATION</h3>
            <p className="text-xs text-muted mb-md">
              Set your Obsidian vault path for automatic reflection sync.
            </p>
            <div className="flex gap-md items-end">
              <div className="flex-1">
                <label className="block text-xs text-muted mb-sm">Vault path</label>
                <input
                  type="text"
                  value={vaultPath}
                  onChange={(e) => setVaultPath(e.target.value)}
                  placeholder="/home/user/Documents/MyVault"
                  className="w-full border border-border-subtle bg-transparent px-md py-sm text-sm font-mono focus:border-border focus:outline-none"
                />
              </div>
              <button
                onClick={saveVaultPath}
                disabled={saving}
                className="border border-border-subtle px-md py-sm text-xs text-muted hover:text-text hover:border-border transition-colors disabled:opacity-50"
              >
                {saving ? "SAVING..." : "SAVE"}
              </button>
            </div>
            {message && (
              <p className={`mt-sm text-xs ${message.type === "success" ? "text-green-500" : "text-red-500"}`}>
                {message.text}
              </p>
            )}
            {settings?.obsidianVaultPath && !message && (
              <p className="mt-sm text-xs text-muted">
                Syncing to: {settings.obsidianVaultPath}
              </p>
            )}
          </div>

          <div className="border border-border p-lg">
            <h3 className="mb-md text-xs">DATA</h3>
            <div className="flex gap-md">
              <button className="border border-border-subtle px-md py-sm text-xs text-muted hover:text-text hover:border-border transition-colors">
                EXPORT JSON
              </button>
              <button className="border border-border-subtle px-md py-sm text-xs text-muted hover:text-text hover:border-border transition-colors">
                EXPORT MARKDOWN
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
