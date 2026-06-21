import { headers } from "next/headers";
import { ExhibitView } from "@/components/exhibit-view";

export const dynamic = "force-dynamic";

type SearchParamsRecord = { [key: string]: string | string[] | undefined };

interface ExhibitApiResponse {
  language: string;
  lyrics: string;
  lensExplanation: string;
  moods: string[];
  themes: Array<{ theme: string; quotes: string[] }>;
  wikiExtract: string;
  wikiImage: string | null;
  wikiSource: string;
  videoId: string | null;
  youtubeThumbnail: string | null;
}

function getBaseUrl(): string {
  const port = process.env.PORT;
  if (port) return `http://127.0.0.1:${port}`;
  const h = headers();
  const host = h.get("host") ?? "localhost";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function ExhibitError() {
  return (
    <main className="flex h-screen items-center justify-center px-6 text-center">
      <p className="text-sm italic text-warm-grey dark:text-cool-grey">
        This exhibit could not be loaded
      </p>
    </main>
  );
}

export default async function ExhibitPage({
  params,
  searchParams,
}: {
  params: { trackId: string };
  searchParams: SearchParamsRecord;
}) {
  const trackId = params.trackId;
  const artist = first(searchParams.artist);
  const title = first(searchParams.title);
  const album = first(searchParams.album);
  const year = first(searchParams.year);
  const language = first(searchParams.language);
  const commontrackId = first(searchParams.commontrackId);

  const base = getBaseUrl();

  try {
    const exhibitUrl = new URL(`${base}/api/exhibit/${encodeURIComponent(trackId)}`);
    exhibitUrl.searchParams.set("commontrackId", commontrackId);
    exhibitUrl.searchParams.set("artist", artist);
    exhibitUrl.searchParams.set("title", title);
    exhibitUrl.searchParams.set("album", album);
    exhibitUrl.searchParams.set("year", year);
    exhibitUrl.searchParams.set("language", language);

    const exRes = await fetch(exhibitUrl.toString(), { cache: "no-store" });
    if (!exRes.ok) throw new Error("exhibit fetch failed");
    const ex = (await exRes.json()) as ExhibitApiResponse;

    const viewLang = ex.language || language;

    let innerWorld = "";
    let theMoment = "";
    const ctxRes = await fetch(`${base}/api/context`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        artist,
        year,
        language: viewLang,
        wikiExtract: ex.wikiExtract,
        wikiSource: ex.wikiSource,
        lensExplanation: ex.lensExplanation,
        moods: ex.moods,
      }),
    });
    if (ctxRes.ok) {
      const ctx = (await ctxRes.json()) as {
        innerWorld?: string;
        theMoment?: string;
      };
      innerWorld = ctx.innerWorld ?? "";
      theMoment = ctx.theMoment ?? "";
    }

    return (
      <ExhibitView
        trackId={trackId}
        title={title}
        artist={artist}
        album={album}
        year={year}
        lyrics={ex.lyrics ?? ""}
        lensExplanation={ex.lensExplanation ?? ""}
        moods={ex.moods ?? []}
        themes={ex.themes ?? []}
        wikiImage={ex.wikiImage ?? null}
        youtubeThumbnail={ex.youtubeThumbnail ?? null}
        videoId={ex.videoId ?? null}
        innerWorld={innerWorld}
        theMoment={theMoment}
        language={viewLang}
      />
    );
  } catch {
    return <ExhibitError />;
  }
}
