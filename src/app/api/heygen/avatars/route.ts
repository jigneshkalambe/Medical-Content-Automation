import { NextResponse } from "next/server";

export async function GET() {
    try {
        const res = await fetch(process.env.HEYGEN_GET_AVATARS_API!, {
            headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
            next: { revalidate: 300 },
        });

        if (!res.ok) throw new Error("Failed to fetch avatars");

        const data = await res.json();

        const avatars = (data.data?.avatars ?? []).map((a: { avatar_id: string; avatar_name: string; preview_image_url?: string; gender?: string }) => ({
            avatar_id: a.avatar_id,
            avatar_name: a.avatar_name,
            preview_image_url: a.preview_image_url ?? null,
            gender: a.gender ?? null,
        }));

        return NextResponse.json({ avatars });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to fetch avatars" }, { status: 500 });
    }
}
