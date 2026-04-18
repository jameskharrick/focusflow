import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const MUSIC_STYLE_PROMPTS: Record<string, string> = {
  "Lo-fi": "lo-fi hip hop, warm vinyl crackle, mellow chords, slow tempo 75bpm, relaxed and cozy, piano and soft drums",
  "Ambient": "ambient electronic, slow evolving pads, atmospheric drone, peaceful and spacious, 60bpm, ethereal reverb",
  "Classical": "classical piano, gentle and focused, adagio tempo, Bach-inspired counterpoint, calm and contemplative",
  "Jazz": "smooth jazz, muted trumpet, upright bass, gentle brushed drums, 90bpm, late night café atmosphere",
  "Nature Sounds": "ambient nature sounds, gentle rain, forest birds, soft wind through leaves, serene and grounding",
  "Electronic Focus": "electronic focus music, binaural beats, subtle synthesizer pulse, 100bpm, clean and minimal, productivity",
  "Epic/Cinematic": "cinematic orchestral, sweeping strings, soft percussion, heroic and motivating, 110bpm, Hans Zimmer inspired",
};

const IMAGE_MOOD_PROMPTS: Record<string, string> = {
  "Lo-fi": "cozy warm-lit study room, soft lamplight, rain on window, autumn afternoon, peaceful",
  "Ambient": "misty mountain valley at dawn, ethereal fog, soft light rays, serene wilderness",
  "Classical": "elegant library with tall bookshelves, warm candlelight, antique wood, golden hour light",
  "Jazz": "dimly lit jazz lounge, neon reflections on wet cobblestones, late night city, moody",
  "Nature Sounds": "tranquil forest glade, dappled sunlight through trees, morning mist, emerald green",
  "Electronic Focus": "minimal futuristic workspace, cool blue lighting, clean geometric lines, focused energy",
  "Epic/Cinematic": "dramatic mountain peak above clouds, golden sunset, epic vast landscape, majestic",
};

function buildFallbackPrompts(task: string, musicStyle: string) {
  const taskLower = task.toLowerCase();
  const mood = taskLower.includes("code") || taskLower.includes("program")
    ? "focused technical work, deep concentration, modern digital workspace"
    : taskLower.includes("write") || taskLower.includes("essay")
    ? "creative writing space, warm intellectual atmosphere, thoughtful and literary"
    : taskLower.includes("study") || taskLower.includes("learn")
    ? "studious environment, organized notes, intellectual curiosity, academic"
    : taskLower.includes("design") || taskLower.includes("art")
    ? "creative studio, artistic inspiration, colorful and imaginative space"
    : "calm focused workspace, productive atmosphere, serene environment";

  const baseMood = IMAGE_MOOD_PROMPTS[musicStyle] ?? IMAGE_MOOD_PROMPTS["Ambient"];
  const musicBase = MUSIC_STYLE_PROMPTS[musicStyle] ?? MUSIC_STYLE_PROMPTS["Ambient"];

  return {
    imagePrompt: `${baseMood}, ${mood}, cinematic composition, beautiful lighting, no people, ultra detailed`,
    musicPrompt: `${musicBase}, perfect for ${task.slice(0, 40)}, focus and flow state`,
  };
}

export async function POST(req: NextRequest) {
  const { task, duration, musicStyle } = await req.json();

  if (!task || !duration || !musicStyle) {
    return NextResponse.json(
      { error: "Missing required fields: task, duration, musicStyle" },
      { status: 400 }
    );
  }

  // Try Gemini first; fall back to local prompt templates on any error
  if (process.env.GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `You are a creative AI assistant helping someone focus on their work.

Generate two prompts for a ${duration}-minute focus session where someone is working on: "${task}"
They want ${musicStyle} music style.

Return ONLY valid JSON with exactly these two fields:
{
  "imagePrompt": "<atmospheric, cinematic image generation prompt for a focused work environment matching the task mood. Beautiful, calming, conducive to focus. 40-60 words. No people.>",
  "musicPrompt": "<music generation prompt for ${musicStyle} style. Include tempo, instruments, emotional tone. 20-30 words.>"
}

Return only the JSON object, no markdown, no explanation.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.imagePrompt && parsed.musicPrompt) {
          return NextResponse.json({
            imagePrompt: parsed.imagePrompt,
            musicPrompt: parsed.musicPrompt,
          });
        }
      }
    } catch (error) {
      console.warn("Gemini failed, using fallback prompts:", (error as Error).message?.slice(0, 100));
    }
  }

  // Fallback: build prompts from curated templates
  const fallback = buildFallbackPrompts(task, musicStyle);
  return NextResponse.json(fallback);
}
