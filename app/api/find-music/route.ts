import { NextRequest, NextResponse } from "next/server";
import type { MusicStyle } from "@/lib/types";

// Curated, YouTube-tested queries per style — used when Gemini is unavailable
// Each variant surfaces a different slice of content on YouTube
const STYLE_VARIANTS: Record<MusicStyle, string[]> = {
  "Lo-fi": [
    "lofi hip hop beats study 1 hour",
    "lofi chill music deep work 2 hours",
    "lofi hip hop relax focus playlist",
    "chill lofi music late night study",
    "lofi beats concentration homework session",
    "lofi hip hop jazzy study vibes",
  ],
  "Ambient": [
    "ambient music deep focus work 1 hour",
    "atmospheric ambient soundscape study 2 hours",
    "ambient drone meditation music focus",
    "peaceful ambient music concentration session",
    "soft ambient music background work",
    "ambient space music deep work flow",
  ],
  "Classical": [
    "classical piano music study focus 1 hour",
    "mozart classical music studying concentration",
    "bach classical music deep work session",
    "beethoven piano focus work 2 hours",
    "baroque classical music studying productivity",
    "chopin piano relaxing study music",
  ],
  "Jazz": [
    "smooth jazz cafe music work concentration",
    "jazz music studying focus background 1 hour",
    "chill jazz instrumental work session",
    "late night jazz music deep focus",
    "smooth jazz piano coffee shop work",
    "jazz trio background music concentration",
  ],
  "Nature Sounds": [
    "rain sounds study focus 1 hour",
    "forest nature sounds deep work ambient",
    "thunderstorm rain concentration sleep study",
    "ocean waves nature sounds relax focus",
    "rain on window study music ambience",
    "nature white noise birds focus work",
  ],
  "Electronic Focus": [
    "electronic focus music deep work 1 hour",
    "binaural beats study concentration music",
    "minimal techno deep focus work session",
    "electronic ambient productivity music 2 hours",
    "deep house background work music focus",
    "synthwave electronic study music beats",
  ],
  "Epic/Cinematic": [
    "epic cinematic music focus motivation 1 hour",
    "cinematic orchestral study music concentration",
    "hans zimmer style background work music",
    "epic orchestral music deep work session",
    "dramatic cinematic background music focus",
    "powerful orchestral music productivity motivation",
  ],
  "Nightcore": [
    "nightcore mix gaming music 1 hour",
    "nightcore anime songs mix playlist",
    "best nightcore songs collection 2 hours",
    "nightcore electronic gaming music mix",
    "nightcore upbeat songs mix playlist",
    "nightcore music mix concentrate focus",
  ],
};

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseIsoDuration(iso: string): number {
  const match = iso.match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] ?? "0") * 3600 +
    parseInt(match[2] ?? "0") * 60 +
    parseInt(match[3] ?? "0")
  );
}

const STYLE_BASE: Record<MusicStyle, string> = {
  "Lo-fi": "lofi hip hop",
  "Ambient": "ambient music",
  "Classical": "classical piano",
  "Jazz": "smooth jazz",
  "Nature Sounds": "nature sounds",
  "Electronic Focus": "electronic focus music",
  "Epic/Cinematic": "cinematic orchestral",
  "Nightcore": "nightcore mix",
};

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","for","to","of","in","on","at","is","am","are",
  "was","were","be","been","have","has","do","does","did","will","would","could",
  "should","can","i","my","me","we","our","you","your","it","its","this","that",
  "with","from","as","by","about","up","into","some","any","just","new","some",
  "working","on","im","going","need","want","trying","making","building","creating",
]);

function taskQuery(task: string, style: MusicStyle): string {
  const keywords = task
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 2)
    .join(" ");

  const base = STYLE_BASE[style];
  return keywords ? `${base} ${keywords} music focus` : STYLE_VARIANTS[style][0];
}

type SearchItem = { id: { videoId: string }; snippet: { title: string; channelTitle: string } };

async function runSearch(
  query: string,
  videoDuration: string,
  apiKey: string,
): Promise<SearchItem[]> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoDuration,
    videoEmbeddable: "true",
    order: "relevance",
    maxResults: "25",
    safeSearch: "strict",
    key: apiKey,
  });
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[find-music] YouTube search error:", res.status, body.slice(0, 300));
    return [];
  }
  const data = await res.json();
  return data.items ?? [];
}

export async function POST(req: NextRequest) {
  try {
    const { musicStyle, duration, task, excludeVideoId } = await req.json() as {
      musicStyle: MusicStyle;
      duration: number | null;
      task?: string;
      excludeVideoId?: string;
    };

    if (!musicStyle) {
      return NextResponse.json({ error: "Missing musicStyle" }, { status: 400 });
    }
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    const videoDuration = duration === null || duration > 20 ? "long" : "medium";
    const variants = shuffle([...STYLE_VARIANTS[musicStyle]]);

    // Search A: task-aware query built from extracted keywords + style base
    // Search B: curated style variant for variety
    const queryA = task?.trim() ? taskQuery(task.trim(), musicStyle) : variants[0];
    console.log("[find-music] search A query:", queryA);

    const [results1, results2] = await Promise.all([
      runSearch(queryA, videoDuration, apiKey),
      runSearch(variants[1] ?? variants[0], videoDuration, apiKey),
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged: SearchItem[] = [];
    for (const item of shuffle([...results1, ...results2])) {
      if (!seen.has(item.id.videoId)) {
        seen.add(item.id.videoId);
        merged.push(item);
      }
    }

    if (!merged.length) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    // Verify embeddability + duration
    const videoIds = merged.map((i) => i.id.videoId).join(",");
    const detailParams = new URLSearchParams({
      part: "contentDetails,status",
      id: videoIds,
      key: apiKey,
    });
    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams}`,
      { cache: "no-store" }
    );
    const detailData = detailRes.ok ? await detailRes.json() : { items: [] };
    const details: {
      id: string;
      status: { embeddable: boolean };
      contentDetails: { duration: string };
    }[] = detailData.items ?? [];

    const embeddable = new Map<string, number>();
    for (const d of details) {
      if (!d.status.embeddable) continue;
      embeddable.set(d.id, parseIsoDuration(d.contentDetails.duration));
    }

    const minSecs = duration ? duration * 60 : 20 * 60;

    const longEnough    = merged.filter((i) => i.id.videoId !== excludeVideoId && (embeddable.get(i.id.videoId) ?? 0) >= minSecs);
    const anyEmbeddable = merged.filter((i) => i.id.videoId !== excludeVideoId && embeddable.has(i.id.videoId));
    const anyResult     = merged.filter((i) => i.id.videoId !== excludeVideoId);

    const pick = longEnough[0] ?? anyEmbeddable[0] ?? anyResult[0] ?? merged[0];

    return NextResponse.json({
      videoId: pick.id.videoId,
      title: pick.snippet.title,
      channel: pick.snippet.channelTitle,
    });
  } catch (err) {
    console.error("[find-music] unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
