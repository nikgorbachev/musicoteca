"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ExhibitTheme {
  theme: string;
  quotes: string[];
}

export interface ExhibitData {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  year: string;
  lyrics: string;
  lensExplanation: string;
  moods: string[];
  themes: ExhibitTheme[];
  wikiImage: string | null;
  youtubeThumbnail: string | null;
  videoId: string | null;
  innerWorld: string;
  theMoment: string;
  language: string;
}

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
  "h-full w-screen shrink-0 snap-start overflow-y-auto px-6 pb-12 pt-16 md:w-auto md:snap-align-none md:px-8";

function toParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ExhibitView({
  title,
  artist,
  year,
  lyrics,
  lensExplanation,
  moods,
  wikiImage,
  youtubeThumbnail,
  innerWorld,
  theMoment,
  language,
}: ExhibitData) {
  const router = useRouter();
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const [showTranslation, setShowTranslation] = useState(false);
  const [translation, setTranslation] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translationFetched, setTranslationFetched] = useState(false);

  const [isDesktop, setIsDesktop] = useState(false);
  const [panel1Basis, setPanel1Basis] = useState<number | null>(null);
  const [navHidden, setNavHidden] = useState(false);
  const draggingRef = useRef(false);
  const lastScrollRef = useRef(0);

  // Track desktop breakpoint; reset the manual width when leaving desktop.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => {
      setIsDesktop(mq.matches);
      if (!mq.matches) setPanel1Basis(null);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Drag-to-resize the lyrics panel's right border (desktop only).
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !rowRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const min = 300;
      const max = rect.width - 2 * 260;
      if (max < min) return;
      let w = e.clientX - rect.left;
      w = Math.max(min, Math.min(max, w));
      setPanel1Basis(w);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  // Horizontal scroll → dot indicator (mobile).
  const handleRowScroll = () => {
    const el = rowRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Vertical scroll inside a panel → hide nav on scroll-down, show on scroll-up.
  const handlePanelScroll = (e: React.UIEvent<HTMLElement>) => {
    const top = e.currentTarget.scrollTop;
    const last = lastScrollRef.current;
    if (top > last && top > 48) setNavHidden(true);
    else if (top < last) setNavHidden(false);
    lastScrollRef.current = top;
  };

  const cover = wikiImage ?? youtubeThumbnail ?? null;
  const innerParas = toParagraphs(innerWorld);
  const momentParas = toParagraphs(theMoment);
  const lang = language.toLowerCase().slice(0, 2);
  const canTranslate = lang !== "en" && lang !== "" && lyrics.trim().length > 0;

  const handleTranslate = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    setShowTranslation(true);
    if (translationFetched || translating) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics, artist, title }),
      });
      const data = (await res.json()) as { translation?: string };
      setTranslation(data.translation ?? "");
    } catch {
      setTranslation("");
    } finally {
      setTranslating(false);
      setTranslationFetched(true);
    }
  };

  const panel1Style =
    isDesktop && panel1Basis != null
      ? { flex: `0 0 ${panel1Basis}px` }
      : undefined;
  const panel1Flex = isDesktop && panel1Basis != null ? "" : "md:flex-1";

  return (
    <main className="relative h-screen overflow-hidden">
      {/* Auto-hiding top nav */}
      <header
        className={`fixed inset-x-0 top-0 z-50 flex items-center px-4 py-3 transition-transform duration-300 ${
          navHidden ? "-translate-y-full" : "translate-y-0"
        } bg-paper/85 backdrop-blur-sm dark:bg-night/85`}
      >
        <button
          type="button"
          onClick={() => router.push("/search")}
          aria-label="Search"
          className="text-warm-grey transition-colors hover:text-ink dark:text-cool-grey dark:hover:text-chalk"
        >
          <span className="text-lg md:hidden" aria-hidden="true">
            ←
          </span>
          <span className="hidden text-xs uppercase tracking-[0.25em] md:inline">
            ⌕ search
          </span>
        </button>
      </header>

      <div
        ref={rowRef}
        onScroll={handleRowScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto md:w-full md:snap-none md:overflow-x-hidden"
      >
        {/* Panel 1 — SONG */}
        <section
          onScroll={handlePanelScroll}
          style={panel1Style}
          className={`${PANEL_BASE} ${panel1Flex}`}
        >
          <div className="flex h-full w-full flex-col">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={`${title} cover`}
                className="aspect-square w-full max-w-sm object-cover"
              />
            ) : (
              <div className="aspect-square w-full max-w-sm bg-night" />
            )}

            <h1 className="mt-6 font-serif text-3xl leading-tight text-ink dark:text-chalk">
              {title}
            </h1>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              {artist}
            </p>

            {moods.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {moods.map((mood) => (
                  <span
                    key={mood}
                    className="text-xs uppercase tracking-[0.2em] text-warm-grey dark:text-cool-grey"
                  >
                    {mood}
                  </span>
                ))}
              </div>
            )}

            <hr className="my-6 border-warm-line dark:border-cool-line" />

            <AudioPlayer />

            <div className="mt-6 whitespace-pre-line text-sm leading-loose text-ink/90 dark:text-chalk/90">
              {lyrics}
            </div>

            {canTranslate && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleTranslate}
                  className="text-xs uppercase tracking-[0.25em] text-warm-grey transition-colors hover:text-ink dark:text-cool-grey dark:hover:text-chalk"
                >
                  {showTranslation ? "hide translation" : "show translation"}
                </button>

                {showTranslation && (
                  <div className="mt-4">
                    <hr className="mb-4 border-warm-line dark:border-cool-line" />
                    {translating ? (
                      <p className="text-xs uppercase tracking-[0.25em] text-warm-grey dark:text-cool-grey">
                        Translating…
                      </p>
                    ) : (
                      <div className="whitespace-pre-line text-sm leading-loose text-warm-grey dark:text-cool-grey">
                        {translation || "Translation unavailable"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <hr className="my-6 border-warm-line dark:border-cool-line" />

            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              Lens
            </p>
            <p className="mt-3 font-serif text-base italic leading-relaxed text-ink dark:text-chalk">
              {lensExplanation}
            </p>
          </div>
        </section>

        {/* Draggable divider (desktop only) */}
        {isDesktop && (
          <div
            onMouseDown={startDrag}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize lyrics panel"
            className="hidden w-1 shrink-0 cursor-col-resize bg-warm-line transition-colors hover:bg-warm-grey md:block dark:bg-cool-line dark:hover:bg-cool-grey"
          />
        )}

        {/* Panel 2 — INNER WORLD */}
        <section onScroll={handlePanelScroll} className={`${PANEL_BASE} md:flex-1`}>
          <div className="mx-auto flex h-full max-w-md flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              Inner World
            </p>
            <p className="mt-2 text-sm text-warm-grey dark:text-cool-grey">
              {artist}
              {year ? ` · ${year}` : ""}
            </p>

            <div className="mt-6 space-y-4 text-sm leading-loose text-ink/90 dark:text-chalk/90">
              {innerParas.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            <div className="mt-auto pt-8">
              <ListenButton />
            </div>
          </div>
        </section>

        {/* Panel 3 — THE MOMENT */}
        <section onScroll={handlePanelScroll} className={`${PANEL_BASE} md:flex-1`}>
          <div className="mx-auto flex h-full max-w-md flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              The Moment
            </p>
            <p className="mt-2 text-sm text-warm-grey dark:text-cool-grey">
              {year}
            </p>

            <div className="mt-6 space-y-4 text-sm leading-loose text-ink/90 dark:text-chalk/90">
              {momentParas.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
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
