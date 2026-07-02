import { NextResponse } from "next/server";
import { getSpeakerAudio } from "@/lib/elevenlabs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get("voice_id");
    const sampleId = searchParams.get("sample_id");
    const speakerId = searchParams.get("speaker_id");

    if (!voiceId || !sampleId || !speakerId) {
        return NextResponse.json({ error: "voice_id, sample_id and speaker_id are required" }, { status: 400 });
    }

    const audio = await getSpeakerAudio(voiceId, sampleId, speakerId);
    return NextResponse.json(audio);
}
