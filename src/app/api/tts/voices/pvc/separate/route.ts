import { NextResponse } from "next/server";
import { separateSpeakers } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    const { voice_id, sample_id } = await request.json();

    if (!voice_id || !sample_id) {
        return NextResponse.json({ error: "voice_id and sample_id are required" }, { status: 400 });
    }

    await separateSpeakers(voice_id, sample_id);
    return NextResponse.json({ success: true });
}
