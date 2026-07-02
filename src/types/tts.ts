export interface Voice {
    voice_id: string;
    name: string;
    category?: string;
    description?: string;
    preview_url?: string;
    labels?: Record<string, string>;
}

export interface TtsSettings {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
}

export interface TtsRequest {
    text: string;
    voice_id: string;
    model_id: string;
    voice_settings: TtsSettings;
}

export interface TtsResponse {
    audio_url: string;
    character_count: number;
}

export interface VoicesResponse {
    voices: Voice[];
}

export type TtsStatus = "idle" | "loading" | "success" | "error";

export interface ModelOption {
    model_id: string;
    name: string;
    description: string;
}
