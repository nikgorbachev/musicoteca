"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SearchResult = {
  trackId: string;
  commontrackId: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  artistId: string;
  albumId: string;
  hasLyrics: boolean;
  language: string;
};

function exhibitHref(result: SearchResult): string {
  const params = new URLSearchParams({
    commontrackId: result.commontrackId,
    artist: result.artist,
    title: result.title,
    album: result.album,
    year: result.year,
    language: result.language,
  });
  return `/exhibit/${result.trackId}?${params.toString()}`;
}

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: SearchResult[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearched(true);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <main className="flex h-screen flex-col px-6">
      <div className="flex items-center gap-4 border-b border-ink/70 py-4 dark:border-chalk/60">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Back home"
          className="shrink-0 text-warm-grey transition-colors hover:text-ink dark:text-cool-grey dark:hover:text-chalk"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="square"
            aria-hidden="true"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="11 18 5 12 11 6" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a song, an artist, a memory"
          aria-label="Search the archive"
          className="w-full bg-transparent font-serif text-lg tracking-wide text-ink placeholder:text-warm-grey/70 focus:outline-none dark:text-chalk dark:placeholder:text-cool-grey/70"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {searched && results.length === 0 ? (
          <p className="mt-8 text-sm italic text-warm-grey dark:text-cool-grey">
            No results
          </p>
        ) : (
          <ul>
            {results.map((result) => (
              <li key={result.trackId}>
                <Link
                  href={exhibitHref(result)}
                  className="block border-b border-warm-line py-4 transition-colors hover:bg-ink/[0.03] dark:border-cool-line dark:hover:bg-chalk/[0.04]"
                >
                  <p className="truncate font-serif text-base text-ink dark:text-chalk">
                    {result.title}
                  </p>
                  <p className="truncate text-xs uppercase tracking-[0.2em] text-warm-grey dark:text-cool-grey">
                    {result.artist}
                    {result.album ? ` · ${result.album}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
