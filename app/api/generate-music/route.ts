import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/sound-generation";

export async function POST(req: NextRequest) {
  const { musicPrompt } = await req.json();

  if (!musicPrompt) {
    return NextResponse.json({ error: "Missing musicPrompt" }, { status: 400 });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(ELEVENLABS_URL, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: musicPrompt,
        duration_seconds: 22,
        prompt_influence: 0.4,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: { message: res.statusText } }));
      const msg = body?.detail?.message ?? `HTTP ${res.status}`;
      console.error("ElevenLabs error:", res.status, msg);
      throw new Error(`ElevenLabs: ${msg}`);
    }

    const audioBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({ audio: `data:audio/mpeg;base64,${base64}` });
  } catch (error) {
    console.error("generate-music error:", error);
    return NextResponse.json({ error: "Failed to generate music" }, { status: 500 });
  }
}
