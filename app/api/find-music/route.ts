import { NextRequest, NextResponse } from "next/server";
import type { MusicStyle } from "@/lib/types";

const STYLE_QUERY_VARIANTS: Record<MusicStyle, string[]> = {
  "Lo-fi": [
    "lofi hip hop beats study relax",
    "lofi chill music work concentration",
    "lofi hip hop radio beats to study",
    "chill lofi beats homework focus",
    "lofi music sleep study relax playlist",
  ],
  "Ambient": [
    "ambient music focus deep work",
    "atmospheric ambient soundscape concentration",
    "ambient drone music study session",
    "deep ambient music productivity",
    "ambient electronic focus work background",
  ],
  "Classical": [
    "classical music studying focus piano",
    "mozart beethoven focus study music",
    "classical piano music work concentration",
    "baroque music studying productivity",
    "classical instrumental music deep work",
  ],
  "Jazz": [
    "smooth jazz music studying work cafe",
    "jazz cafe music concentration background",
    "chill jazz beats work study",
    "smooth jazz instrumental focus playlist",
    "jazz music work from home background",
  ],
  "Nature Sounds": [
    "nature sounds rain forest ambient study",
    "rain sounds focus study sleep",
    "forest birds nature white noise work",
    "thunderstorm rain sounds concentration",
    "ocean waves nature sounds relaxation focus",
  ],
  "Electronic Focus": [
    "electronic focus music deep work binaural",
    "techno minimal electronic work concentration",
    "electronic study music focus beats",
    "deep house electronic focus productivity",
    "minimal electronic ambient work music",
  ],
  "Epic/Cinematic": [
    "epic cinematic music focus motivation work",
    "cinematic orchestral study music",
    "epic background music concentration",
    "hans zimmer style focus music",
    "dramatic orchestral music deep work",
  ],
};

const DURATION_HINTS = ["1 hour", "2 hours", "3 hours", "mix", "playlist", "compilation"];

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

export async function POST(req: NextRequest) {
  try {
    const { musicStyle, duration, excludeVideoId } = await req.json() as {
      musicStyle: MusicStyle;
      duration: number | null;
      excludeVideoId?: string;
    };

    if (!musicStyle) {
      return NextResponse.json({ error: "Missing musicStyle" }, { status: 400 });
    }
    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json({ error: "YOUTUBE_API_KEY not configured" }, { status: 500 });
    }

    const variants = STYLE_QUERY_VARIANTS[musicStyle];
    const baseQuery = variants[Math.floor(Math.random() * variants.length)];

    const hint = Math.random() < 0.6
      ? DURATION_HINTS[Math.floor(Math.random() * DURATION_HINTS.length)]
      : (duration === null || duration >= 60 ? "2 hours" : duration >= 30 ? "1 hour" : "");
    const query = hint ? `${baseQuery} ${hint}` : baseQuery;

    const order = Math.random() < 0.5 ? "relevance" : "viewCount";
    const videoDuration = duration === null || duration > 20 ? "long" : "medium";

    console.log(`[find-music] query="${query}" order=${order} videoDuration=${videoDuration}`);

    const searchParams = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      videoDuration,
      videoEmbeddable: "true",
      order,
      maxResults: "25",
      safeSearch: "strict",
      key: process.env.YOUTUBE_API_KEY,
    });

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
      { next: { revalidate: 0 } }
    );

    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      console.error("[find-music] YouTube search failed:", searchRes.status, JSON.stringify(err));
      return NextResponse.json(
        { error: `YouTube search failed (${searchRes.status})` },
        { status: 502 }
      );
    }

    const searchData = await searchRes.json();
    const items: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] =
      searchData.items ?? [];

    console.log(`[find-music] got ${items.length} results`);

    if (!items.length) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    // Fetch content details to check embeddability and duration
    const videoIds = items.map((i) => i.id.videoId).join(",");
    const detailParams = new URLSearchParams({
      part: "contentDetails,status",
      id: videoIds,
      key: process.env.YOUTUBE_API_KEY,
    });

    const detailRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams}`,
      { next: { revalidate: 0 } }
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

    console.log(`[find-music] ${embeddable.size} embeddable videos`);

    const minSecs = duration ? duration * 60 : 20 * 60;
    const shuffled = shuffle([...items]);

    const longEnough = shuffled.filter(
      (i) => i.id.videoId !== excludeVideoId && (embeddable.get(i.id.videoId) ?? 0) >= minSecs
    );

    // Fall back: any embeddable video regardless of duration
    const anyEmbeddable = shuffled.filter(
      (i) => i.id.videoId !== excludeVideoId && embeddable.has(i.id.videoId)
    );

    // Last resort: any result except the excluded one
    const anyResult = shuffled.filter((i) => i.id.videoId !== excludeVideoId);

    const pick = (longEnough[0] ?? anyEmbeddable[0] ?? anyResult[0] ?? items[0]);

    console.log(`[find-music] picked videoId=${pick.id.videoId} title="${pick.snippet.title}"`);

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
