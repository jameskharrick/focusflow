import { NextRequest, NextResponse } from "next/server";
import type { MusicStyle } from "@/lib/types";

// Multiple query variants per style — rotated randomly to hit different result sets
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

// Duration hints added to certain queries for better results
const DURATION_HINTS = ["1 hour", "2 hours", "3 hours", "mix", "playlist", "compilation"];

// Shuffle an array in-place (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: NextRequest) {
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

  // Pick a random query variant for this style
  const variants = STYLE_QUERY_VARIANTS[musicStyle];
  const baseQuery = variants[Math.floor(Math.random() * variants.length)];

  // Randomly append a duration/type hint ~60% of the time
  const hint = Math.random() < 0.6
    ? DURATION_HINTS[Math.floor(Math.random() * DURATION_HINTS.length)]
    : (duration === null || duration >= 60 ? "2 hours" : duration >= 30 ? "1 hour" : "");
  const query = hint ? `${baseQuery} ${hint}` : baseQuery;

  // Randomise sort order — viewCount surfaces popular staples, relevance surfaces fresher picks
  const order = Math.random() < 0.5 ? "relevance" : "viewCount";

  const videoDuration = duration === null || duration > 20 ? "long" : "medium";

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
    const err = await searchRes.json();
    console.error("YouTube search error:", err);
    return NextResponse.json({ error: "YouTube search failed" }, { status: 500 });
  }

  const searchData = await searchRes.json();
  const items: { id: { videoId: string }; snippet: { title: string; channelTitle: string } }[] =
    searchData.items ?? [];

  if (!items.length) {
    return NextResponse.json({ error: "No videos found" }, { status: 404 });
  }

  // Verify embeddability + get durations
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

  const detailData = await detailRes.json();
  const details: {
    id: string;
    status: { embeddable: boolean };
    contentDetails: { duration: string };
  }[] = detailData.items ?? [];

  const embeddable = new Map<string, number>();
  for (const d of details) {
    if (!d.status.embeddable) continue;
    const match = d.contentDetails.duration.match(/(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) continue;
    const secs =
      parseInt(match[1] ?? "0") * 3600 +
      parseInt(match[2] ?? "0") * 60 +
      parseInt(match[3] ?? "0");
    embeddable.set(d.id, secs);
  }

  const minSecs = duration ? duration * 60 : 20 * 60;

  // Shuffle the full result set before filtering so rank order doesn't dominate
  const shuffled = shuffle([...items]);

  const longEnough = shuffled.filter(
    (i) => i.id.videoId !== excludeVideoId && (embeddable.get(i.id.videoId) ?? 0) >= minSecs
  );

  const candidates = longEnough.length
    ? longEnough
    : shuffled.filter((i) => i.id.videoId !== excludeVideoId && embeddable.has(i.id.videoId));

  if (!candidates.length) {
    const fallback = shuffled.find((i) => i.id.videoId !== excludeVideoId) ?? items[0];
    return NextResponse.json({
      videoId: fallback.id.videoId,
      title: fallback.snippet.title,
      channel: fallback.snippet.channelTitle,
    });
  }

  // Pick randomly from the shuffled candidates (already shuffled — just take first)
  const pick = candidates[0];

  return NextResponse.json({
    videoId: pick.id.videoId,
    title: pick.snippet.title,
    channel: pick.snippet.channelTitle,
  });
}
