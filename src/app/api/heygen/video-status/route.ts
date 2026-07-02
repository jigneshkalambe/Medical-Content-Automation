import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("video_id");

    if (!videoId) {
        return NextResponse.json({ error: "video_id is required" }, { status: 400 });
    }

    try {
        // const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        const res = await fetch(`${process.env.HEYGEN_VIDEO_GENERATE_API}/${videoId}`, {
            headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
        });
        console.log("res video-status", res);
        const data = await res.json();
        console.log("data video-status", data);
        if (!res.ok) throw new Error(data.message ?? "Failed to fetch video status");

        return NextResponse.json({
            status: data.data.status,
            video_url: data.data.video_url ?? null,
            thumbnail_url: data.data.thumbnail_url ?? null,
            duration: data.data.duration ?? null,
            error: data.data.error ?? null,
        });
    } catch (error) {
        console.error("Error fetching video status:", error);
        return NextResponse.json({ error: (error as Error).message ?? "Failed to fetch status" }, { status: 500 });
    }
}
