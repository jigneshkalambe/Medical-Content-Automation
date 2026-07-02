import { NextResponse } from "next/server";
import { trainPVCVoice } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    const { voice_id, model_id } = await request.json();

    if (!voice_id) {
        return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
    }

    await trainPVCVoice(voice_id, model_id);
    return NextResponse.json({ success: true });
}
