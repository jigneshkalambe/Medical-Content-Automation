import { NextResponse } from "next/server";
import { uploadPVCSamples } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    const formData = await request.formData();
    const voiceId = formData.get("voice_id") as string;
    const files = formData.getAll("files") as File[];

    if (!voiceId || files.length === 0) {
        return NextResponse.json({ error: "voice_id and at least one file are required" }, { status: 400 });
    }

    const samples = await uploadPVCSamples(voiceId, files);
    return NextResponse.json({ success: true, samples });
}
