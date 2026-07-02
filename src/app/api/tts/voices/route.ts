import { NextResponse } from "next/server";
import { fetchVoices } from "@/lib/elevenlabs";

export async function GET() {
    try {
        const voices = await fetchVoices();
        return NextResponse.json({ voices });
    } catch (error) {
        console.error("Error fetching voices:", error);
        return NextResponse.json(
            { error: "Failed to fetch voices" },
            { status: 500 }
        );
    }
}
