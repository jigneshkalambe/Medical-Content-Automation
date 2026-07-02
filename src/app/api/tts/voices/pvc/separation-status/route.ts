import { NextResponse } from "next/server";
import { getSeparationStatus } from "@/lib/elevenlabs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get("voice_id");
    const sampleId = searchParams.get("sample_id");

    if (!voiceId || !sampleId) {
        return NextResponse.json({ error: "voice_id and sample_id are required" }, { status: 400 });
    }

    const status = await getSeparationStatus(voiceId, sampleId);
    return NextResponse.json(status);
}
