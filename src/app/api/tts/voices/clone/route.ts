import { NextResponse } from "next/server";
import { addVoice } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const file = formData.get("file") as File;

        if (!name || !file) {
            return NextResponse.json(
                { error: "Name and audio file are required" },
                { status: 400 }
            );
        }

        const newVoice = await addVoice(name, description, file);

        return NextResponse.json({ success: true, voice: newVoice });
    } catch (error) {
        console.error("Error cloning voice:", error);
        return NextResponse.json(
            { error: "Failed to clone voice" },
            { status: 500 }
        );
    }
}
