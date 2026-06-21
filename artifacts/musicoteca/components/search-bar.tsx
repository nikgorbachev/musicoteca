"use client";

import { useRouter } from "next/navigation";

export function SearchBar() {
  const router = useRouter();

  const goToSearch = () => router.push("/search");

  return (
    <div className="w-full">
      <div className="flex items-center border-b border-ink/70 pb-2 dark:border-chalk/60">
        <input
          type="search"
          readOnly
          onFocus={goToSearch}
          onClick={goToSearch}
          placeholder="Name a song"
          aria-label="Search the archive"
          className="w-full cursor-pointer bg-transparent font-serif text-lg tracking-wide text-ink placeholder:text-warm-grey/70 focus:outline-none dark:text-chalk dark:placeholder:text-cool-grey/70"
        />
        <button
          type="button"
          onClick={goToSearch}
          className="ml-4 shrink-0 text-xs uppercase tracking-[0.25em] text-warm-grey transition-colors hover:text-ink dark:text-cool-grey dark:hover:text-chalk"
        >
          Enter
        </button>
      </div>
    </div>
  );
}
