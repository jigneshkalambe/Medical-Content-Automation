import { NextResponse } from "next/server";
import { createPVCVoice } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    const { name, description, language } = await request.json();

    if (!name || !language) {
        return NextResponse.json({ error: "Name and language are required" }, { status: 400 });
    }

    const voice = await createPVCVoice(name, description ?? "", language);
    return NextResponse.json({ voice_id: voice.voiceId });
}
