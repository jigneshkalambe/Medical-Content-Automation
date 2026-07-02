import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { ModelOption, Voice } from "@/types/tts";

export function getElevenLabsClient(): ElevenLabsClient {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error("ELEVENLABS_API_KEY is not set in environment variables.");
    }
    return new ElevenLabsClient({ apiKey });
}

export async function fetchVoices(): Promise<Voice[]> {
    const client = getElevenLabsClient();
    const response = await client.voices.getAll();
    return response.voices.map((v) => ({
        voice_id: v.voiceId,
        name: v.name ?? "Unknown",
        category: v.category ?? undefined,
        description: v.description ?? undefined,
        preview_url: v.previewUrl ?? undefined,
        labels: v.labels ? Object.fromEntries(Object.entries(v.labels).map(([k, val]) => [k, val ?? ""])) : undefined,
    }));
}

export async function generateSpeech(text: string, voiceId: string, modelId: string, stability: number, similarityBoost: number, style: number, useSpeakerBoost: boolean = true): Promise<Uint8Array> {
    const client = getElevenLabsClient();

    const audioStream = await client.textToSpeech.convert(voiceId, {
        text,
        modelId,
        voiceSettings: {
            stability,
            similarityBoost,
            style,
            useSpeakerBoost: useSpeakerBoost ?? true,
        },
    });

    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }

    // Merge chunks into one Uint8Array
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

export async function addVoice(name: string, description: string, file: File) {
    const client = getElevenLabsClient();
    return await client.voices.ivc.create({
        name,
        description,
        files: [file],
    });
}

// Step 1: Create the PVC voice (no files yet)
export async function createPVCVoice(name: string, description: string, language: string) {
    const client = getElevenLabsClient();
    return await client.voices.pvc.create({ name, description, language });
}

// Step 2: Upload audio samples to an existing PVC voice
export async function uploadPVCSamples(voiceId: string, files: File[]) {
    const client = getElevenLabsClient();
    // Convert File objects to Blobs/Buffers the SDK accepts
    const buffers = await Promise.all(
        files.map(async (f) => {
            const arrayBuffer = await f.arrayBuffer();
            return new Blob([arrayBuffer], { type: f.type });
        }),
    );
    // return await client.voices.pvc.samples.create({ voice_id: voiceId, files: buffers });
    return await client.voices.pvc.samples.create(voiceId, { files: buffers });
}

// Step 3: Trigger speaker separation for a sample
export async function separateSpeakers(voiceId: string, sampleId: string) {
    const client = getElevenLabsClient();
    return await client.voices.pvc.samples.speakers.separate(voiceId, sampleId);
}

// Step 3b: Poll separation status
export async function getSeparationStatus(voiceId: string, sampleId: string) {
    const client = getElevenLabsClient();
    return await client.voices.pvc.samples.speakers.get(voiceId, sampleId);
}

// Step 4: Get speaker audio (base64) to preview & identify the right speaker
export async function getSpeakerAudio(voiceId: string, sampleId: string, speakerId: string) {
    const client = getElevenLabsClient();
    return await client.voices.pvc.samples.speakers.audio.get(voiceId, sampleId, speakerId);
}

// Step 5: Select which speaker to use for the clone
export async function selectSpeaker(voiceId: string, sampleId: string, speakerId: string) {
    const client = getElevenLabsClient();
    return await client.voices.pvc.samples.update(voiceId, sampleId, {
        selectedSpeakerIds: [speakerId],
    });
}

// Step 6: Get the CAPTCHA image the voice owner must read aloud
export async function getPVCCaptcha(voiceId: string) {
    const client = getElevenLabsClient();
    return await client.voices.pvc.verification.captcha.get(voiceId); // returns base64 image
}

// Step 6b: Submit the recorded captcha reading for verification
export async function submitCaptchaVerification(voiceId: string, recordingFile: File) {
    const client = getElevenLabsClient();
    const buffer = await recordingFile.arrayBuffer();
    const blob = new Blob([buffer], { type: recordingFile.type });
    return await client.voices.pvc.verification.captcha.verify(voiceId, { recording: blob });
}

// Step 7 (optional): Request manual verification if captcha isn't possible
export async function requestManualVerification(voiceId: string, files: File[]) {
    const client = getElevenLabsClient();
    const blobs = await Promise.all(files.map(async (f) => new Blob([await f.arrayBuffer()], { type: f.type })));
    return await client.voices.pvc.verification.request(voiceId, { files: blobs });
}

// Step 8: Kick off training
export async function trainPVCVoice(voiceId: string, modelId = "eleven_multilingual_v2") {
    const client = getElevenLabsClient();
    return await client.voices.pvc.train(voiceId, { modelId });
}

// Step 8b: Poll training status
export async function getPVCTrainingStatus(voiceId: string) {
    const client = getElevenLabsClient();
    const voice = await client.voices.get(voiceId);
    return {
        state: voice.fineTuning?.state?.["eleven_multilingual_v2"],
        progress: voice.fineTuning?.progress?.["eleven_multilingual_v2"],
    };
}

export const ELEVENLABS_MODELS: ModelOption[] = [
    {
        model_id: "eleven_multilingual_v2",
        name: "Multilingual v2",
        description: "High quality, supports 29 languages",
    },
    {
        model_id: "eleven_turbo_v2_5",
        name: "Turbo v2.5",
        description: "Low latency, English optimized",
    },
    {
        model_id: "eleven_turbo_v2",
        name: "Turbo v2",
        description: "Fast generation, English only",
    },
    {
        model_id: "eleven_monolingual_v1",
        name: "Monolingual v1",
        description: "Classic English model",
    },
];
