"use client";

import { useState } from "react";

type SearchResult = {
  trackId: string;
  title: string;
  artist: string;
};

type SearchResponse = {
  results: SearchResult[];
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResponse = await res.json();
      // Placeholder: results are empty for now. Wired up for future exhibits.
      void data;
    } catch {
      // Intentionally silent for the placeholder search.
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center border-b border-ink/70 pb-2 dark:border-chalk/60">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a song, an artist, a memory"
          aria-label="Search the archive"
          className="w-full bg-transparent font-serif text-lg tracking-wide text-ink placeholder:text-warm-grey/70 focus:outline-none dark:text-chalk dark:placeholder:text-cool-grey/70"
        />
        <button
          type="submit"
          disabled={loading}
          className="ml-4 shrink-0 text-xs uppercase tracking-[0.25em] text-warm-grey transition-colors hover:text-ink disabled:opacity-50 dark:text-cool-grey dark:hover:text-chalk"
        >
          {loading ? "..." : "Enter"}
        </button>
      </div>
    </form>
  );
}
