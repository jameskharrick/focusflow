import { InferenceClient } from "@huggingface/inference";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { imagePrompt } = await req.json();

    if (!imagePrompt) {
      return NextResponse.json({ error: "Missing imagePrompt" }, { status: 400 });
    }

    const client = new InferenceClient(process.env.HUGGINGFACE_API_TOKEN);
    const enhancedPrompt = `${imagePrompt}, cinematic lighting, highly detailed, atmospheric, beautiful, serene, no text, no watermark`;

    // SDK types incorrectly say string; runtime returns Blob
    const result = await client.textToImage({
      model: "black-forest-labs/FLUX.1-schnell",
      inputs: enhancedPrompt,
      parameters: { num_inference_steps: 4, width: 1024, height: 576 },
    });

    const blob = result as unknown as Blob;
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = blob.type || "image/jpeg";

    return NextResponse.json({ image: `data:${mimeType};base64,${base64}` });
  } catch (error) {
    console.error("generate-image error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
