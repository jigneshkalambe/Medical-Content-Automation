import { uploadAsset } from "@/lib/heygen";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get("content-type") || "application/octet-stream";

        const fileBuffer = await req.arrayBuffer();

        await uploadAsset(fileBuffer, contentType);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error uploading asset:", error);
        return NextResponse.json({ error: "Failed to upload asset" }, { status: 500 });
    }
}
