import { NextResponse } from "next/server";
import { getPVCTrainingStatus } from "@/lib/elevenlabs";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const voiceId = searchParams.get("voice_id");

    if (!voiceId) {
        return NextResponse.json({ error: "voice_id is required" }, { status: 400 });
    }

    const status = await getPVCTrainingStatus(voiceId);
    return NextResponse.json(status);
}
