import { NextResponse } from "next/server";
import { selectSpeaker } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    const { voice_id, sample_id, speaker_id } = await request.json();

    if (!voice_id || !sample_id || !speaker_id) {
        return NextResponse.json({ error: "voice_id, sample_id and speaker_id are required" }, { status: 400 });
    }

    const result = await selectSpeaker(voice_id, sample_id, speaker_id);
    return NextResponse.json({ success: true, result });
}
