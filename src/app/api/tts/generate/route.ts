import { NextResponse } from "next/server";
import { generateSpeech } from "@/lib/elevenlabs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const text = formData.get("text") as string;
        const voice_id = formData.get("voice_id") as string;
        const model_id = formData.get("model_id") as string;

        const generate_video = formData.get("generate_video") === "true";
        const avatar_id = formData.get("avatar_id") as string | null;
        const imageFile = formData.get("image") as File | null;
        const image_url = (formData.get("image_url") as string | null) ?? undefined;
        const audio_url = (formData.get("audio_url") as string | null) ?? undefined;
        const voice_settings = JSON.parse(formData.get("voice_settings") as string);

        // ── New HeyGen params ──
        const title = (formData.get("title") as string | null) ?? undefined;
        const resolution = (formData.get("resolution") as string | null) ?? "720p";
        const aspect_ratio = (formData.get("aspect_ratio") as string | null) ?? "16:9";
        const motion_prompt = (formData.get("motion_prompt") as string | null) ?? undefined;
        const expressiveness = (formData.get("expressiveness") as string | null) ?? undefined;
        const remove_background = formData.get("remove_background") === "true";
        const bg_raw = formData.get("background") as string | null;
        const background = bg_raw ? JSON.parse(bg_raw) : undefined;
        const hg_voice_settings_raw = formData.get("hg_voice_settings") as string | null;
        const hg_voice_settings = hg_voice_settings_raw ? JSON.parse(hg_voice_settings_raw) : undefined;

        if (!text || !voice_id || !model_id || !voice_settings) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        //  Step 1 — Generate audio via ElevenLabs
        const audioBuffer = await generateSpeech(text, voice_id, model_id, voice_settings.stability, voice_settings.similarity_boost, voice_settings.style, voice_settings.use_speaker_boost);

        let videoId: string | null = null;

        if (generate_video) {
            if (!avatar_id && !imageFile && !image_url) {
                return NextResponse.json({ error: "Provide either avatar_id OR image" }, { status: 400 });
            }

            // //  Upload audio asset
            // const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" });
            // const audioForm = new FormData();
            // audioForm.append("file", audioBlob, "audio.mp3");
            // audioForm.append("type", "audio");

            // const audioUploadRes = await fetch(process.env.HEYGEN_UPLOAD_ASSET!, {
            //     method: "POST",
            //     headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
            //     body: audioForm,
            // });
            // const audioData = await audioUploadRes.json();
            // if (!audioUploadRes.ok) throw new Error("Audio upload failed");

            let audio_asset_id: string | undefined;

            if (!audio_url) {
                // const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" });
                // const audioForm = new FormData();
                // audioForm.append("file", audioBlob, "audio.mp3");
                // audioForm.append("type", "audio");

                // const audioBlob = new Blob([Buffer.from(audioBuffer)], { type: "audio/mpeg" });
                // const audioForm = new FormData();
                // audioForm.append("file", new File([audioBlob], "audio.mp3", { type: "audio/mpeg" }));
                // audioForm.append("type", "audio");

                // const audioUploadRes = await fetch(process.env.HEYGEN_UPLOAD_ASSET!, {
                //     method: "POST",
                //     headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
                //     body: audioForm,
                // });
                // const audioData = await audioUploadRes.json();
                // console.log("audioData", audioData);
                // if (!audioUploadRes.ok) throw new Error("Audio upload failed");
                // audio_asset_id = audioData.data.id;

                const audioUploadRes = await fetch(process.env.HEYGEN_UPLOAD_ASSET!, {
                    method: "POST",
                    headers: {
                        "X-Api-Key": process.env.HEYGEN_API_KEY!,
                        "Content-Type": "audio/mpeg",
                    },
                    body: Buffer.from(audioBuffer),
                });

                const audioData = await audioUploadRes.json();
                console.log("audioData", audioData);
                if (!audioUploadRes.ok) throw new Error("Audio upload failed");
                audio_asset_id = audioData.data.id;
            }

            //  Upload image asset (if provided)
            let image_asset_id: string | undefined;
            if (imageFile && !image_url) {
                // const imageForm = new FormData();
                // imageForm.append("file", imageFile);
                // imageForm.append("type", "image");

                // const imageUploadRes = await fetch(process.env.HEYGEN_UPLOAD_ASSET!, {
                //     method: "POST",
                //     headers: { "X-Api-Key": process.env.HEYGEN_API_KEY! },
                //     body: imageForm,
                // });
                // const imageData = await imageUploadRes.json();
                // if (!imageUploadRes.ok) throw new Error("Image upload failed");
                // image_asset_id = imageData.data.id;

                const imageUploadRes = await fetch(process.env.HEYGEN_UPLOAD_ASSET!, {
                    method: "POST",
                    headers: {
                        "X-Api-Key": process.env.HEYGEN_API_KEY!,
                        "Content-Type": imageFile.type, // image/png or image/jpeg
                    },
                    body: Buffer.from(await imageFile.arrayBuffer()),
                });

                const imageData = await imageUploadRes.json();
                console.log("imageData", imageData);
                if (!imageUploadRes.ok) throw new Error("Image upload failed");
                image_asset_id = imageData.data.id;
            }

            //  Build video payload
            const videoPayload: Record<string, unknown> = {
                // Character — mutually exclusive
                ...(avatar_id ? { avatar_id } : image_url ? { image_url } : { image_asset_id }),

                // Audio — mutually exclusive
                ...(audio_url ? { audio_url } : { audio_asset_id }),

                // ── Output settings ──
                resolution,
                aspect_ratio,
                remove_background,

                // ── Optional fields ──
                ...(title && { title }),
                ...(motion_prompt && { motion_prompt }),
                ...(expressiveness && { expressiveness }),
                ...(background && { background }),
                ...(hg_voice_settings && { voice_settings: hg_voice_settings }),
            };

            const videoRes = await fetch(process.env.HEYGEN_VIDEO_GENERATE_API!, {
                method: "POST",
                headers: {
                    "X-Api-Key": process.env.HEYGEN_API_KEY!,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(videoPayload),
            });

            const videoData = await videoRes.json();
            console.log("videoData", videoData);
            console.log("videoRes status", videoRes.status);
            if (!videoRes.ok) throw new Error("Video generation failed");
            videoId = videoData.data.video_id;
        }

        return new NextResponse(new Uint8Array(audioBuffer), {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length.toString(),
                ...(videoId ? { "X-Video-Id": videoId } : {}),
            },
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
    }
}
