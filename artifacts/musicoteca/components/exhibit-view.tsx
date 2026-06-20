"use client";

import { useRef, useState } from "react";

const TRACK = {
  title: "Звезда по имени Солнце",
  artist: "Кино",
  year: "1989",
  place: "Leningrad, USSR",
  cover: "https://placehold.co/600x600/0D0F14/F0F0ED?text=К",
};

const LYRICS = `Lorem ipsum dolor sit amet,
consectetur adipiscing elit.

Sed do eiusmod tempor incididunt
ut labore et dolore magna aliqua.

Ut enim ad minim veniam,
quis nostrud exercitation ullamco.

Duis aute irure dolor in reprehenderit
in voluptate velit esse cillum.

Excepteur sint occaecat cupidatat
non proident, sunt in culpa.`;

const LENS_SUMMARY =
  "A meditation on fate and quiet resistance — a song that turns the ordinary act of waiting into something luminous and almost sacred.";

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function AudioPlayer() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause" : "Play"}
        className="shrink-0 text-ink transition-colors hover:text-warm-grey dark:text-chalk dark:hover:text-cool-grey"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="h-0.5 flex-1 bg-warm-line dark:bg-cool-line">
        <div className="h-full bg-ink dark:bg-chalk" style={{ width: "0%" }} />
      </div>
    </div>
  );
}

function ListenButton() {
  return (
    <button
      type="button"
      className="text-xs uppercase tracking-[0.25em] text-warm-grey transition-colors hover:text-ink dark:text-cool-grey dark:hover:text-chalk"
    >
      ▶ Listen
    </button>
  );
}

const PANEL_BASE =
  "h-full w-screen shrink-0 snap-start overflow-y-auto px-6 py-10 md:w-1/4 md:snap-align-none md:px-8";

export function ExhibitView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <main className="relative h-screen overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto md:snap-none md:overflow-x-hidden"
      >
        {/* Panel 1 — SONG */}
        <section className={PANEL_BASE}>
          <div className="mx-auto flex h-full max-w-md flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={TRACK.cover}
              alt={`${TRACK.title} cover`}
              className="aspect-square w-full object-cover"
            />
            <h1 className="mt-6 font-serif text-3xl leading-tight text-ink dark:text-chalk">
              {TRACK.title}
            </h1>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              {TRACK.artist}
            </p>

            <hr className="my-6 border-warm-line dark:border-cool-line" />

            <AudioPlayer />

            <div className="mt-6 whitespace-pre-line text-sm leading-loose text-ink/90 dark:text-chalk/90">
              {LYRICS}
            </div>

            <hr className="my-6 border-warm-line dark:border-cool-line" />

            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              Lens
            </p>
            <p className="mt-3 font-serif text-base italic leading-relaxed text-ink dark:text-chalk">
              {LENS_SUMMARY}
            </p>
          </div>
        </section>

        {/* Panel 2 — INNER WORLD */}
        <section className={`${PANEL_BASE} md:w-1/2`}>
          <div className="mx-auto flex h-full max-w-md flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              Inner World
            </p>
            <p className="mt-2 text-sm text-warm-grey dark:text-cool-grey">
              {TRACK.artist} · {TRACK.year}
            </p>

            <div className="mt-6 space-y-4 text-sm leading-loose text-ink/90 dark:text-chalk/90">
              <p>{LOREM}</p>
              <p>{LOREM}</p>
            </div>

            <div className="mt-auto pt-8">
              <ListenButton />
            </div>
          </div>
        </section>

        {/* Panel 3 — THE MOMENT */}
        <section className={PANEL_BASE}>
          <div className="mx-auto flex h-full max-w-md flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              The Moment
            </p>
            <p className="mt-2 text-sm text-warm-grey dark:text-cool-grey">
              {TRACK.place} · {TRACK.year}
            </p>

            <div className="mt-6 space-y-4 text-sm leading-loose text-ink/90 dark:text-chalk/90">
              <p>{LOREM}</p>
              <p>{LOREM}</p>
            </div>

            <div className="mt-auto pt-8">
              <ListenButton />
            </div>
          </div>
        </section>
      </div>

      {/* Dot indicator (mobile only) */}
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 md:hidden">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full border ${
              active === i
                ? "border-ink bg-ink dark:border-chalk dark:bg-chalk"
                : "border-warm-grey dark:border-cool-grey"
            }`}
          />
        ))}
      </div>
    </main>
  );
}
