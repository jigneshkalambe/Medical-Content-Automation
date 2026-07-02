"use client";

import { Wand2, Loader2, Sparkles, Video, Download, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

import { VoiceSelector } from "./voice-selector";
import { AudioPlayer } from "./audio-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

import { ELEVENLABS_MODELS } from "@/lib/elevenlabs";
import type { TtsSettings, Voice, TtsStatus } from "@/types/tts";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type VideoStatus = "idle" | "pending" | "processing" | "completed" | "failed";

interface VideoState {
    videoId: string | null;
    status: VideoStatus;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
}

const INITIAL_VIDEO_STATE: VideoState = {
    videoId: null,
    status: "idle",
    videoUrl: null,
    thumbnailUrl: null,
    duration: null,
};

function VideoStatusBadge({ status }: { status: VideoStatus }) {
    const map: Record<VideoStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        idle: { label: "Idle", variant: "outline" },
        pending: { label: "Queued", variant: "secondary" },
        processing: { label: "Processing", variant: "secondary" },
        completed: { label: "Ready", variant: "default" },
        failed: { label: "Failed", variant: "destructive" },
    };
    const { label, variant } = map[status];
    return (
        <Badge variant={variant} className="flex items-center gap-1.5">
            {(status === "pending" || status === "processing") && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === "completed" && <CheckCircle2 className="h-3 w-3" />}
            {status === "failed" && <XCircle className="h-3 w-3" />}
            {status === "pending" && <Clock className="h-3 w-3" />}
            {label}
        </Badge>
    );
}

export function TtsForm() {
    const [voices, setVoices] = useState<Voice[]>([]);
    const [isLoadingVoices, setIsLoadingVoices] = useState(true);
    const [patientName, setPatientName] = useState("");
    const [text, setText] = useState("");
    const [selectedVoice, setSelectedVoice] = useState<string>("");
    const [selectedModel, setSelectedModel] = useState<string>(ELEVENLABS_MODELS[0].model_id);
    const [settings, setSettings] = useState<TtsSettings>({
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
    });

    const [generateVideo, setGenerateVideo] = useState(false);
    const [avatarId, setAvatarId] = useState("");

    const [status, setStatus] = useState<TtsStatus>("idle");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [video, setVideo] = useState<VideoState>(INITIAL_VIDEO_STATE);
    const [mode, setMode] = useState<"avatar" | "image">("avatar");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState("");
    const [audioUrl_hg, setAudioUrl_hg] = useState(""); // HeyGen audio_url, separate from local audioUrl
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Avatar list
    const [avatars, setAvatars] = useState<{ avatar_id: string; avatar_name: string; preview_image_url: string | null; gender: string | null }[]>([]);
    const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);

    // New HeyGen video params
    const [videoTitle, setVideoTitle] = useState("");
    const [resolution, setResolution] = useState("720p");
    const [aspectRatio, setAspectRatio] = useState("16:9");
    const [motionPrompt, setMotionPrompt] = useState("");
    const [expressiveness, setExpressiveness] = useState("medium");
    const [removeBackground, setRemoveBackground] = useState(false);
    const [bgColor, setBgColor] = useState("#ffffff");
    const [hgSpeed, setHgSpeed] = useState(1.0);
    const [hgPitch, setHgPitch] = useState(0);
    const [hgLocale, setHgLocale] = useState("");

    const [bgType, setBgType] = useState<"color" | "image">("color");
    const [bgUrl, setBgUrl] = useState("");

    const prefix = patientName ? `Hey, ${patientName}!` : "";
    const fullText = `${prefix} ${text}`;

    // useEffect(() => {
    //     setText((prev) => {
    //         if (!prev || prev.startsWith("Hey,")) {
    //             return `Hey, ${patientName}!`;
    //         }
    //         return prev;
    //     });
    // }, [patientName]);

    useEffect(() => {
        return () => {
            if (imageFile) {
                URL.revokeObjectURL(URL.createObjectURL(imageFile));
            }
        };
    }, [imageFile]);

    useEffect(() => {
        async function loadVoices() {
            try {
                const response = await fetch("/api/tts/voices");
                if (!response.ok) throw new Error("Failed to fetch voices");
                const data = await response.json();
                setVoices(data.voices);
                if (data.voices.length > 0) setSelectedVoice(data.voices[0].voice_id);
            } catch (error) {
                console.error(error);
                toast.error("Failed to load voices. Please check your API key.");
            } finally {
                setIsLoadingVoices(false);
            }
        }
        loadVoices();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    useEffect(() => {
        if (!generateVideo || avatars.length > 0) return;
        const getAvatar = async () => {
            setIsLoadingAvatars(true);
            await fetch("/api/heygen/avatars")
                .then((r) => r.json())
                .then((d) => setAvatars(d.avatars ?? []))
                .catch(() => toast.error("Failed to load avatars"))
                .finally(() => setIsLoadingAvatars(false));
        };

        getAvatar();
    }, [generateVideo]);

    const startPolling = (videoId: string) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                // const res = await fetch(`/api/heygen/video-status/${videoId}`);
                const res = await fetch(`/api/heygen/video-status?video_id=${videoId}`);
                const data = await res.json();

                console.log("data tts-form", data);

                setVideo((prev) => ({
                    ...prev,
                    status: data.status,
                    videoUrl: data.video_url ?? prev.videoUrl,
                    thumbnailUrl: data.thumbnail_url ?? prev.thumbnailUrl,
                    duration: data.duration ?? prev.duration,
                }));
                if (data.status === "completed") {
                    clearInterval(pollRef.current!);
                    pollRef.current = null;
                    toast.success("🎬 Video is ready!");
                }
                if (data.status === "failed") {
                    clearInterval(pollRef.current!);
                    pollRef.current = null;
                    toast.error(`Video generation failed: ${data.error ?? "Unknown error"}`);
                }
            } catch {
            }
        }, 5000);
    };

    const handleGenerate = async () => {
        if (!text.trim()) return toast.error("Please enter some text.");
        if (!selectedVoice) return toast.error("Please select a voice.");
        // if (generateVideo && !avatarId.trim()) return toast.error("Please enter an Avatar ID.");
        if (generateVideo && !avatarId.trim() && !imageFile && !imageUrl.trim()) {
            return toast.error("Please provide either an Avatar ID or upload an image.");
        }

        setStatus("loading");
        setAudioUrl(null);
        setVideo(INITIAL_VIDEO_STATE);
        if (pollRef.current) clearInterval(pollRef.current);

        try {
            // const response = await fetch("/api/tts/generate", {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({
            //         text,
            //         voice_id: selectedVoice,
            //         model_id: selectedModel,
            //         voice_settings: settings,
            //         ...(generateVideo && {
            //             generate_video: true,
            //             avatar_id: avatarId,
            //             avatar_style: avatarStyle,
            //         }),
            //     }),
            // });

            const formData = new FormData();

            formData.append("text", text);
            formData.append("voice_id", selectedVoice);
            formData.append("model_id", selectedModel);
            formData.append("voice_settings", JSON.stringify(settings));

            if (generateVideo) {
                formData.append("generate_video", "true");
                if (audioUrl_hg.trim()) formData.append("audio_url", audioUrl_hg);
                if (mode === "avatar") {
                    formData.append("avatar_id", avatarId);
                    // formData.append("avatar_style", avatarStyle);
                } else {
                    if (imageUrl.trim()) {
                        formData.append("image_url", imageUrl);
                    } else if (imageFile) {
                        formData.append("image", imageFile);
                    }
                }

                formData.append("resolution", resolution);
                formData.append("aspect_ratio", aspectRatio);
                formData.append("remove_background", String(removeBackground));
                if (videoTitle.trim()) formData.append("title", videoTitle);
                if (motionPrompt.trim()) formData.append("motion_prompt", motionPrompt);
                if (expressiveness) formData.append("expressiveness", expressiveness);
                // formData.append("background", JSON.stringify({ type: "color", value: bgColor }));
                const background = removeBackground ? undefined : bgType === "color" ? { type: "color", value: bgColor } : { type: "image", url: bgUrl };

                if (background) formData.append("background", JSON.stringify(background));
                formData.append("hg_voice_settings", JSON.stringify({ speed: hgSpeed, pitch: hgPitch, ...(hgLocale.trim() && { locale: hgLocale }) }));
            }

            const response = await fetch("/api/tts/generate", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to generate");
            }

            // Must read header BEFORE consuming body as blob
            const videoId = response.headers.get("X-Video-Id");

            const audioBlob = await response.blob();
            setAudioUrl(URL.createObjectURL(audioBlob));
            setStatus("success");
            toast.success("Audio generated successfully!");

            if (videoId) {
                setVideo({ videoId, status: "pending", videoUrl: null, thumbnailUrl: null, duration: null });
                toast.info("Video job submitted — processing...");
                startPolling(videoId);
            }
        } catch (error) {
            console.error(error);
            setStatus("error");
            toast.error((error as Error).message || "Failed to generate audio");
        }
    };

    const isGenerating = status === "loading";
    const isVideoProcessing = video.status === "pending" || video.status === "processing";

    return (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-8 col-span-1 flex flex-col gap-6">
                <Card className="border-border">
                    <CardHeader>
                        {/* <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Script Input
                        </CardTitle>
                        <CardDescription>Enter the text you want to convert to speech.</CardDescription> */}
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <Label htmlFor="patient-name" className="text-base">
                                Patient Name
                            </Label>
                        </CardTitle>
                        {/* <CardDescription>Enter the patient name.</CardDescription> */}
                    </CardHeader>
                    <CardContent>
                        <Input id="patient-name" placeholder="Enter patient name..." value={patientName} onChange={(e) => setPatientName(e.target.value)} disabled={isGenerating} />

                        <div className="mt-4 space-y-4">
                            <div className="flex gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />{" "}
                                <Label htmlFor="script-input" className="text-base">
                                    Script Input
                                </Label>
                            </div>
                            <Textarea
                                id="script-input"
                                placeholder="Type or paste your script here..."
                                className="min-h-[200px] resize-y text-base"
                                value={fullText}
                                //  onChange={(e) => setText(e.target.value)}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val.startsWith(prefix)) return;
                                    const editablePart = val.slice(prefix.length).trimStart();
                                    setText(editablePart);
                                }}
                            />
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground text-right">{text.length} characters</div>
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-4 border-t px-6 py-4">
                        <Button size="lg" className="w-full sm:w-auto sm:self-end font-medium" onClick={handleGenerate} disabled={isGenerating || isLoadingVoices || !text.trim()}>
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : generateVideo ? (
                                <>
                                    <Video className="mr-2 h-4 w-4" />
                                    Generate Audio + Video
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    Generate Audio
                                </>
                            )}
                        </Button>

                        {audioUrl && (
                            <div className="w-full pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <Label className="mb-2 block text-sm text-muted-foreground">Generated Audio</Label>
                                <AudioPlayer audioUrl={audioUrl} />
                            </div>
                        )}
                    </CardFooter>
                </Card>
                {generateVideo && (
                    <Card className="border-border animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Video className="h-5 w-5 text-primary" />
                                Video Settings
                            </CardTitle>
                            <CardDescription>Configure your HeyGen avatar video</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Character</Label>
                                    <div className="flex rounded-lg border p-1 gap-1">
                                        <button type="button" onClick={() => setMode("avatar")} disabled={isGenerating} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "avatar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                            Avatar
                                        </button>
                                        <button type="button" onClick={() => setMode("image")} disabled={isGenerating} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === "image" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                            Custom Image
                                        </button>
                                    </div>

                                    {mode === "avatar" && (
                                        <div className="space-y-2">
                                            {isLoadingAvatars ? (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading avatars...
                                                </div>
                                            ) : (
                                                <Select value={avatarId} onValueChange={setAvatarId} disabled={isGenerating}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select an avatar">
                                                            {avatarId &&
                                                                (() => {
                                                                    const av = avatars.find((a) => a.avatar_id === avatarId);
                                                                    return av ? (
                                                                        <div className="flex items-center gap-2">
                                                                            {av.preview_image_url && <Image width={20} height={20} src={av.preview_image_url} alt="" className="h-5 w-5 rounded-full object-cover" />}
                                                                            <span>{av.avatar_name}</span>
                                                                        </div>
                                                                    ) : null;
                                                                })()}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-64">
                                                        {avatars.map((av, ind) => (
                                                            <SelectItem key={`${av.avatar_id}-${ind}`} value={av.avatar_id} className="py-2 cursor-pointer">
                                                                <div className="flex items-center gap-2.5">
                                                                    {av.preview_image_url ? <img width={32} height={32} src={av.preview_image_url} alt={av.avatar_name} className="h-8 w-8 rounded-full object-cover shrink-0 border" /> : <div className="h-8 w-8 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs text-muted-foreground">{av.avatar_name.charAt(0)}</div>}
                                                                    <div className="flex flex-col min-w-0">
                                                                        <span className="text-sm font-medium truncate">{av.avatar_name}</span>
                                                                        {av.gender && <span className="text-xs text-muted-foreground capitalize">{av.gender}</span>}
                                                                    </div>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    )}

                                    {mode === "image" && (
                                        <div className="space-y-2">
                                            <Input ref={fileInputRef} type="file" accept="image/*" disabled={isGenerating} onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
                                            {imageFile && (
                                                <>
                                                    <div className="rounded-md overflow-hidden border bg-muted/30 flex items-center justify-center">
                                                        <Image src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full max-h-[400px] object-contain" width={400} height={400} />
                                                    </div>
                                                    <Button
                                                        onClick={() => {
                                                            setImageFile(null);
                                                            if (fileInputRef.current) {
                                                                fileInputRef.current.value = "";
                                                            }
                                                        }}
                                                        className="mt-2"
                                                    >
                                                        Clear
                                                    </Button>
                                                </>
                                            )}
                                            <span className="text-xs text-muted-foreground">Allowed: image/png image/jpeg video/mp4 video/webm audio/mpeg</span>
                                            <div className="relative flex items-center gap-2">
                                                <div className="h-px flex-1 bg-border" />
                                                <span className="text-xs text-muted-foreground">or</span>
                                                <div className="h-px flex-1 bg-border" />
                                            </div>
                                            <Input placeholder="https://example.com/avatar.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} disabled={isGenerating} />
                                            {imageUrl && (
                                                <>
                                                    <div className="rounded-md overflow-hidden border bg-muted/30 flex items-center justify-center">
                                                        <img src={imageUrl} alt="Preview" className="w-full h-full max-h-[400px] object-contain" width={400} height={400} />
                                                    </div>
                                                    <Button onClick={() => setImageUrl("")}>Clear</Button>
                                                </>
                                            )}
                                            <p className="text-xs text-muted-foreground">Public image URL — mutually exclusive with upload.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Output</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Resolution</Label>
                                            <Select value={resolution} onValueChange={setResolution} disabled={isGenerating}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="720p">720p</SelectItem>
                                                    <SelectItem value="1080p">1080p</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                                            <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isGenerating}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="16:9">16:9</SelectItem>
                                                    <SelectItem value="9:16">9:16</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Video Title (optional)</Label>
                                        <Input placeholder="My HeyGen Video" value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} disabled={isGenerating} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Audio URL (optional)</Label>
                                        <Input placeholder="https://example.com/audio.mp3" value={audioUrl_hg} onChange={(e) => setAudioUrl_hg(e.target.value)} disabled={isGenerating} />
                                        <p className="text-xs text-muted-foreground">Overrides ElevenLabs audio upload.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 border-t pt-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Avatar Behaviour</Label>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Expressiveness</Label>
                                        <Select value={expressiveness} onValueChange={setExpressiveness} disabled={isGenerating}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">Photo avatars only</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Motion Prompt (optional)</Label>
                                        <Input placeholder="e.g. subtle head nod" value={motionPrompt} onChange={(e) => setMotionPrompt(e.target.value)} disabled={isGenerating} />
                                        <p className="text-xs text-muted-foreground">Photo avatars only</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Voice Tuning</Label>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs text-muted-foreground">Speed</Label>
                                            <span className="text-xs tabular-nums">{hgSpeed.toFixed(1)}x</span>
                                        </div>
                                        <Slider value={[hgSpeed]} min={0.5} max={1.5} step={0.1} onValueChange={([v]) => setHgSpeed(v)} disabled={isGenerating} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs text-muted-foreground">Pitch</Label>
                                            <span className="text-xs tabular-nums">{hgPitch > 0 ? `+${hgPitch}` : hgPitch} st</span>
                                        </div>
                                        <Slider value={[hgPitch]} min={-50} max={50} step={1} onValueChange={([v]) => setHgPitch(v)} disabled={isGenerating} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Locale (optional)</Label>
                                        <Input placeholder="e.g. en-US, hi-IN" value={hgLocale} onChange={(e) => setHgLocale(e.target.value)} disabled={isGenerating} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Background</Label>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs text-muted-foreground">Remove Background</Label>
                                        <Switch checked={removeBackground} onCheckedChange={setRemoveBackground} disabled={isGenerating} />
                                    </div>
                                    {!removeBackground && (
                                        <>
                                            <div className="flex rounded-lg border p-1 gap-1">
                                                <button type="button" onClick={() => setBgType("color")} disabled={isGenerating} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${bgType === "color" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                                    Color
                                                </button>
                                                <button type="button" onClick={() => setBgType("image")} disabled={isGenerating} className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${bgType === "image" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                                                    Image URL
                                                </button>
                                            </div>
                                            {bgType === "color" && (
                                                <div className="flex items-center gap-3">
                                                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5" disabled={isGenerating} />
                                                    <span className="text-sm font-mono text-muted-foreground">{bgColor}</span>
                                                </div>
                                            )}
                                            {bgType === "image" && (
                                                <div className="space-y-2">
                                                    <Input placeholder="https://example.com/bg.jpg" value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} disabled={isGenerating} />
                                                    <p className="text-xs text-muted-foreground">Publicly accessible image URL</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {video.videoId && (
                    <Card className="border-border animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Video className="h-5 w-5 text-primary" />
                                    Generated Video
                                </CardTitle>
                                <VideoStatusBadge status={video.status} />
                            </div>
                            <CardDescription>
                                {video.status === "pending" && "Your video is queued — usually takes 1–3 minutes."}
                                {video.status === "processing" && "HeyGen is rendering your video..."}
                                {video.status === "completed" && "Your video is ready to watch and download."}
                                {video.status === "failed" && "Video generation failed. Try regenerating."}
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            {isVideoProcessing && (
                                <div className="flex flex-col items-center justify-center rounded-lg border bg-muted/30 py-12 gap-3">
                                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                                    <p className="text-sm text-muted-foreground">Polling every 5 seconds…</p>
                                </div>
                            )}

                            {video.status === "completed" && video.videoUrl && (
                                <div className="space-y-3">
                                    <video controls className="w-full rounded-lg border bg-black" poster={video.thumbnailUrl ?? undefined} src={video.videoUrl} />
                                    {video.duration && <p className="text-xs text-muted-foreground">Duration: {Math.round(video.duration)}s</p>}
                                </div>
                            )}

                            {video.status === "failed" && (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-10 gap-2">
                                    <XCircle className="h-8 w-8 text-destructive" />
                                    <p className="text-sm text-destructive">Video generation failed.</p>
                                </div>
                            )}
                        </CardContent>

                        {video.status === "completed" && video.videoUrl && (
                            <CardFooter className="border-t px-6 py-4">
                                <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" download>
                                    <Button variant="outline" size="sm">
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Video
                                    </Button>
                                </a>
                            </CardFooter>
                        )}
                    </Card>
                )}
            </div>

            <div className="lg:col-span-4 col-span-1 flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Voice Settings</CardTitle>
                        <CardDescription>Configure the AI voice model</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <Label>Voice</Label>
                            <VoiceSelector voices={voices} selectedId={selectedVoice} onSelect={setSelectedVoice} isLoading={isLoadingVoices} />
                        </div>

                        <div className="space-y-3">
                            <Label>Model</Label>
                            <Select value={selectedModel} onValueChange={setSelectedModel}>
                                <SelectTrigger className="h-12!">
                                    <SelectValue placeholder="Select a model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ELEVENLABS_MODELS.map((model) => (
                                        <SelectItem key={model.model_id} value={model.model_id} className="py-2 px-4 cursor-pointer">
                                            <div className="flex flex-col">
                                                <span>{model.name}</span>
                                                <span className="text-xs text-muted-foreground">{model.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label>Stability</Label>
                                <span className="text-xs text-muted-foreground">{settings.stability.toFixed(2)}</span>
                            </div>
                            <Slider value={[settings.stability]} max={1} step={0.01} onValueChange={([val]) => setSettings((s) => ({ ...s, stability: val }))} />
                            <p className="text-xs text-muted-foreground">More variable → More stable</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Clarity + Similarity</Label>
                                <span className="text-xs text-muted-foreground">{settings.similarity_boost.toFixed(2)}</span>
                            </div>
                            <Slider value={[settings.similarity_boost]} max={1} step={0.01} onValueChange={([val]) => setSettings((s) => ({ ...s, similarity_boost: val }))} />
                            <p className="text-xs text-muted-foreground">Low → High</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Video className="h-4 w-4 text-primary" />
                                    Video Generation
                                </CardTitle>
                                <CardDescription className="mt-1">Generate a HeyGen avatar video</CardDescription>
                            </div>
                            <Switch
                                checked={generateVideo}
                                onCheckedChange={(val) => {
                                    setGenerateVideo(val);
                                    if (!val) setVideo(INITIAL_VIDEO_STATE);
                                }}
                                disabled={isGenerating}
                            />
                        </div>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
