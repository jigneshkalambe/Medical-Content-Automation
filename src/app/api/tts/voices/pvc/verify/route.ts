import { NextResponse } from "next/server";
import { submitCaptchaVerification } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    const formData = await request.formData();
    const voiceId = formData.get("voice_id") as string;
    const recording = formData.get("recording") as File;

    if (!voiceId || !recording) {
        return NextResponse.json({ error: "voice_id and recording are required" }, { status: 400 });
    }

    const result = await submitCaptchaVerification(voiceId, recording);
    return NextResponse.json({ success: true, result });
}
