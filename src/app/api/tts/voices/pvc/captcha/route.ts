import { NextResponse } from "next/server";
import { getPVCCaptcha } from "@/lib/elevenlabs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get("voice_id");

    if (!voiceId) {
        return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
    }

    const captcha = await getPVCCaptcha(voiceId);
    // captcha is a base64 string — wrap it so frontend can render as <img>
    return NextResponse.json({ image_base64: captcha });
}
