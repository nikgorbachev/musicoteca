"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

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
  wikiUrl: string | null;
  youtubeThumbnail: string | null;
  videoId: string | null;
  innerWorld: string;
  theMoment: string;
  language: string;
  titleTranslit: string;
  artistTranslit: string;
}

const RU_TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterateRu(text: string): string {
  return text
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      const mapped = RU_TRANSLIT[lower];
      if (mapped === undefined) return ch;
      if (mapped === "") return "";
      return ch === lower
        ? mapped
        : mapped.charAt(0).toUpperCase() + mapped.slice(1);
    })
    .join("");
}

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
    </svg>
  );
}

function renderMarkdown(text: string, lang: string, showTranslit: boolean) {
  return (
    <ReactMarkdown
      components={{
        strong: ({ children }) => {
          // Safely extract plain text from children (may be nested React nodes)
          const extractText = (node: ReactNode): string => {
            if (typeof node === "string") return node;
            if (typeof node === "number") return String(node);
            if (Array.isArray(node)) return node.map(extractText).join("");
            if (node && typeof node === "object" && "props" in node) {
              const el = node as ReactElement<{ children?: ReactNode }>;
              return extractText(el.props.children);
            }
            return "";
          };
          const entityText = extractText(children);
          if (!entityText) return <strong>{children}</strong>;
          const wikiUrl = `https://${lang}.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(
            entityText,
          )}`;
          const isNonLatin = /[\u0400-\u04FF\u0600-\u06FF\u3040-\u9FFF\u0370-\u03FF]/.test(
            entityText,
          );
          const displayText =
            showTranslit && isNonLatin ? transliterateRu(entityText) : entityText;
          return (
            <a
              href={wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-ink underline decoration-warm-grey/40 underline-offset-4 transition-colors hover:decoration-ink dark:text-chalk dark:hover:decoration-chalk"
              title={`Search Wikipedia for ${entityText}`}
            >
              {displayText}
            </a>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
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
  "h-full w-screen shrink-0 snap-start overflow-y-auto px-6 pb-16 pt-16 md:w-auto md:snap-align-none md:px-8";

export function ExhibitView({
  title,
  artist,
  year,
  lyrics,
  lensExplanation,
  moods,
  wikiImage,
  wikiUrl,
  youtubeThumbnail,
  videoId,
  innerWorld,
  theMoment,
  language,
  titleTranslit,
  artistTranslit,
}: ExhibitData) {
  const router = useRouter();
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const [showTranslit, setShowTranslit] = useState(false);
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

  const isYoutubeThumbnail = !wikiImage && !!youtubeThumbnail;
  const coverSrc = wikiImage ?? youtubeThumbnail ?? null;
  const lang = language.toLowerCase().slice(0, 2);
  const canTranslate = lang !== "en" && lang !== "" && lyrics.trim().length > 0;
  const NON_LATIN_RE = /[\u0400-\u04FF\u0600-\u06FF\u3040-\u9FFF\u0370-\u03FF\uAC00-\uD7AF]/;
  const hasTranslit = NON_LATIN_RE.test(title) || NON_LATIN_RE.test(artist);
  const displayTitle = showTranslit && titleTranslit ? titleTranslit : title;
  const displayArtist = showTranslit && artistTranslit ? artistTranslit : artist;

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
          <div className="flex h-full w-full flex-col pb-8">
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt={`${title} cover`}
                className={
                  isYoutubeThumbnail
                    ? "w-full max-w-sm object-contain"
                    : "aspect-square w-full max-w-sm object-cover"
                }
              />
            ) : (
              <div className="aspect-square w-full max-w-sm bg-ink/10 dark:bg-chalk/10" />
            )}

            <div className="mt-6 flex items-start gap-3">
              <h1 className="font-serif text-3xl leading-tight text-ink dark:text-chalk">
                {displayTitle}
              </h1>
              {hasTranslit && (
                <button
                  type="button"
                  onClick={() => setShowTranslit((v) => !v)}
                  aria-label="Toggle transliteration"
                  aria-pressed={showTranslit}
                  className={`mt-1 shrink-0 transition-colors ${
                    showTranslit
                      ? "text-ink dark:text-chalk"
                      : "text-warm-grey hover:text-ink dark:text-cool-grey dark:hover:text-chalk"
                  }`}
                >
                  <GlobeIcon />
                </button>
              )}
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              {displayArtist}
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

            {videoId && (
              <a
                href={`https://youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 self-start border border-ink px-4 py-2 text-xs uppercase tracking-[0.25em] text-ink transition-colors hover:bg-ink hover:text-paper dark:border-chalk dark:text-chalk dark:hover:bg-chalk dark:hover:text-night"
              >
                ▶ Watch on YouTube
              </a>
            )}

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

            <div className="mt-6 whitespace-pre-line text-sm leading-loose text-ink/90 dark:text-chalk/90">
              {lyrics}
            </div>

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
          <div className="mx-auto flex h-full max-w-md flex-col pb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              Inner World
            </p>
            <p className="mt-2 text-sm text-warm-grey dark:text-cool-grey">
              {artist}
              {year ? ` · ${year}` : ""}
            </p>

            <div className="mt-4">
              <ListenButton />
            </div>

            <div className="mt-6 space-y-4 text-sm leading-loose text-ink/90 dark:text-chalk/90">
              {renderMarkdown(innerWorld, lang, showTranslit)}
            </div>

            <div className="mt-auto pt-8">
              {wikiUrl && (
                <a
                  href={wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block text-xs uppercase tracking-[0.25em] text-warm-grey/60 transition-colors hover:text-warm-grey dark:text-cool-grey/60 dark:hover:text-cool-grey"
                >
                  source: wikipedia ↗
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Panel 3 — THE MOMENT */}
        <section onScroll={handlePanelScroll} className={`${PANEL_BASE} md:flex-1`}>
          <div className="mx-auto flex h-full max-w-md flex-col pb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-warm-grey dark:text-cool-grey">
              The Moment
            </p>
            <p className="mt-2 text-sm text-warm-grey dark:text-cool-grey">
              {year}
            </p>

            <div className="mt-4">
              <ListenButton />
            </div>

            <div className="mt-6 space-y-4 text-sm leading-loose text-ink/90 dark:text-chalk/90">
              {renderMarkdown(theMoment, lang, showTranslit)}
            </div>

            <div className="mt-auto pt-8">
              {wikiUrl && (
                <a
                  href={wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block text-xs uppercase tracking-[0.25em] text-warm-grey/60 transition-colors hover:text-warm-grey dark:text-cool-grey/60 dark:hover:text-cool-grey"
                >
                  source: wikipedia ↗
                </a>
              )}
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
