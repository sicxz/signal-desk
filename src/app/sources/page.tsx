"use client";

import { useEffect, useState } from "react";
import { Source } from "@/lib/types";

type SourceType = "rss" | "api" | "email";

function isEmailSource(source: Pick<Source, "type" | "url">) {
  return source.type === "email" || source.url.startsWith("mailto:");
}

function getLocatorLabel(type: SourceType) {
  return type === "email" ? "Sender Email" : "URL";
}

function getLocatorPlaceholder(type: SourceType) {
  if (type === "email") {
    return "newsletter@example.com";
  }

  if (type === "rss") {
    return "https://example.com/feed.xml";
  }

  return "https://dev.to/api/articles?per_page=20&tag=ai";
}

function displaySourceLocator(source: Source) {
  if (isEmailSource(source)) {
    return source.url.replace(/^mailto:/i, "");
  }

  return source.url;
}

function displaySourceType(source: Source) {
  return isEmailSource(source) ? "EMAIL" : source.type.toUpperCase();
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    type: "api" as SourceType,
    tag: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSources() {
      const res = await fetch("/api/sources");
      const { sources } = await res.json();

      if (!active) {
        return;
      }

      if (sources) {
        setSources(sources);
      }

      setLoading(false);
    }

    void loadSources();

    return () => {
      active = false;
    };
  }, []);

  async function toggleActive(source: Source) {
    const res = await fetch(`/api/sources/${source.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !source.active }),
    });
    if (res.ok) {
      setSources((prev) =>
        prev.map((s) =>
          s.id === source.id ? { ...s, active: !s.active } : s
        )
      );
    }
  }

  async function deleteSource(id: string) {
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      const { source } = await res.json();
      setSources((prev) => [source, ...prev]);
      setFormData({ name: "", url: "", type: "api", tag: "" });
      setShowForm(false);
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="text-[#656d76]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa]">
      <header className="bg-white border-b border-[#d1d9e0]">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-[#1f2328]">Sources</h1>
              <p className="text-sm text-[#656d76] mt-0.5">
                Manage article feed sources
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-[#1f883d] text-white hover:bg-[#1a7f37] transition-colors"
            >
              {showForm ? "Cancel" : "Add Source"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-4">
        {showForm && (
          <form
            onSubmit={addSource}
            className="bg-white border border-[#d1d9e0] rounded-md p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1f2328] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Dev.to AI"
                  className="w-full px-3 py-1.5 text-sm bg-[#f6f8fa] border border-[#d1d9e0] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1f2328] mb-1">
                  {getLocatorLabel(formData.type)}
                </label>
                <input
                  type={formData.type === "email" ? "email" : "url"}
                  required
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder={getLocatorPlaceholder(formData.type)}
                  className="w-full px-3 py-1.5 text-sm bg-[#f6f8fa] border border-[#d1d9e0] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                />
                {formData.type === "email" && (
                  <p className="mt-1 text-xs text-[#656d76]">
                    Matches newsletter emails by sender inside the IMAP inbox configured in env.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1f2328] mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as SourceType,
                    })
                  }
                  className="w-full px-3 py-1.5 text-sm bg-[#f6f8fa] border border-[#d1d9e0] rounded-md text-[#1f2328] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                >
                  <option value="api">API</option>
                  <option value="rss">RSS</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1f2328] mb-1">
                  Tag
                </label>
                <input
                  type="text"
                  required
                  value={formData.tag}
                  onChange={(e) =>
                    setFormData({ ...formData, tag: e.target.value })
                  }
                  placeholder="ai"
                  className="w-full px-3 py-1.5 text-sm bg-[#f6f8fa] border border-[#d1d9e0] rounded-md text-[#1f2328] placeholder-[#656d76] focus:outline-none focus:ring-2 focus:ring-[#0969da] focus:border-[#0969da]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-[#1f883d] text-white hover:bg-[#1a7f37] disabled:opacity-50 transition-colors"
              >
                {submitting ? "Adding..." : "Add Source"}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white border border-[#d1d9e0] rounded-md overflow-hidden">
          {sources.length === 0 ? (
            <div className="text-center py-12 text-[#656d76]">
              No sources configured. Add one to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#d1d9e0] bg-[#f6f8fa]">
                  <th className="text-left px-4 py-2.5 font-medium text-[#1f2328]">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#1f2328] hidden sm:table-cell">
                    URL
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#1f2328]">
                    Type
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-[#1f2328]">
                    Tag
                  </th>
                  <th className="text-center px-4 py-2.5 font-medium text-[#1f2328]">
                    Active
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr
                    key={source.id}
                    className="border-b border-[#d1d9e0] last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[#1f2328] font-medium">
                      {source.name}
                    </td>
                    <td className="px-4 py-3 text-[#656d76] hidden sm:table-cell">
                      <span className="truncate block max-w-[280px]">
                        {displaySourceLocator(source)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#ddf4ff] text-[#0969da]">
                        {displaySourceType(source)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#656d76]">{source.tag}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(source)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          source.active ? "bg-[#1f883d]" : "bg-[#d1d9e0]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                            source.active
                              ? "translate-x-[18px]"
                              : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteSource(source.id)}
                        className="text-[#656d76] hover:text-[#d1242f] text-sm transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
