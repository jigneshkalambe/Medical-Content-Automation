"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, Mic, ShieldCheck, Upload, UploadCloud, Volume2, Wand2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Speaker {
    speaker_id: string;
}

interface SampleState {
    sample_id: string;
    separationStatus: "pending" | "processing" | "completed" | "failed";
    speakers: Speaker[];
    selectedSpeakerId: string | null;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface WizardState {
    step: Step;
    voiceId: string | null;
    samples: SampleState[];
    captchaImage: string | null;
    trainingState: string | null;
    trainingProgress: number | null;
}

const STORAGE_KEY = "pvc_wizard_state";

const STEPS = [
    { label: "Setup", icon: Mic },
    { label: "Upload", icon: Upload },
    { label: "Separate", icon: Loader2 },
    { label: "Speaker", icon: Volume2 },
    { label: "Verify", icon: ShieldCheck },
    { label: "Train", icon: Wand2 },
    { label: "Done", icon: CheckCircle2 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function saveState(state: WizardState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
}

function loadState(): WizardState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as WizardState) : null;
    } catch {
        return null;
    }
}

function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {}
}

const INITIAL_STATE: WizardState = {
    step: 1,
    voiceId: null,
    samples: [],
    captchaImage: null,
    trainingState: null,
    trainingProgress: null,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
    return (
        <div className="flex items-center justify-between mb-8 px-2">
            {STEPS.map((s, i) => {
                const stepNum = (i + 1) as Step;
                const done = current > stepNum;
                const active = current === stepNum;
                const Icon = s.icon;
                return (
                    <div key={s.label} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-background text-primary" : "border-muted-foreground/30 bg-background text-muted-foreground/40"}`}
                            >
                                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                            </div>
                            <span className={`text-[10px] font-medium ${active ? "text-primary" : done ? "text-primary/70" : "text-muted-foreground/40"}`}>{s.label}</span>
                        </div>
                        {i < STEPS.length - 1 && <div className={`h-px w-6 sm:w-10 mx-1 mb-4 transition-colors duration-300 ${done ? "bg-primary" : "bg-muted-foreground/20"}`} />}
                    </div>
                );
            })}
        </div>
    );
}

function FileDropZone({
    files,
    onFiles,
    disabled,
    multiple = false,
    accept = "audio/*",
    label,
    hint,
    maxSizeMB = 50,
}: {
    files: File[];
    onFiles: (files: File[]) => void;
    disabled?: boolean;
    multiple?: boolean;
    accept?: string;
    label: string;
    hint: string;
    maxSizeMB?: number;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const validate = (incoming: File[]) => {
        const valid = incoming.filter((f) => {
            if (f.size > maxSizeMB * 1024 * 1024) {
                toast.error(`${f.name} exceeds ${maxSizeMB}MB limit`);
                return false;
            }
            return true;
        });
        if (valid.length) onFiles(valid);
    };

    return (
        <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-all cursor-pointer
                ${dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}
                ${disabled ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => ref.current?.click()}
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                validate(Array.from(e.dataTransfer.files));
            }}
        >
            <input
                ref={ref}
                type="file"
                className="hidden"
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files) validate(Array.from(e.target.files));
                    e.target.value = "";
                }}
            />
            {files.length === 0 ? (
                <div className="space-y-2 flex flex-col items-center">
                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
            ) : (
                <div className="w-full space-y-2">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                            <span className="truncate max-w-[200px] font-medium">{f.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onFiles(files.filter((_, j) => j !== i));
                                    }}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">Click or drop to add more files</p>
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PVCCloneForm({ onSuccess }: { onSuccess?: () => void }) {
    const [wizard, setWizard] = useState<WizardState>(INITIAL_STATE);
    const [busy, setBusy] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [language, setLanguage] = useState("en");
    const [audioFiles, setAudioFiles] = useState<File[]>([]);
    const [captchaRecording, setCaptchaRecording] = useState<File | null>(null);
    const separationPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const trainingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const saved = loadState();
        if (saved && saved.voiceId) {
            setWizard(saved);
            // If we were mid-separation, resume polling
            if (saved.step === 3) startSeparationPolling(saved.voiceId, saved.samples);
            // If we were mid-training, resume polling
            if (saved.step === 6) startTrainingPolling(saved.voiceId);
        }
        return () => {
            if (separationPollRef.current) clearInterval(separationPollRef.current);
            if (trainingPollRef.current) clearInterval(trainingPollRef.current);
        };
    }, []);

    const update = useCallback((patch: Partial<WizardState>) => {
        setWizard((prev) => {
            const next = { ...prev, ...patch };
            saveState(next);
            return next;
        });
    }, []);

    // ── Step 1: Create PVC voice ──────────────────────────────────────────────
    const handleCreate = async () => {
        if (!name.trim()) return toast.error("Voice name is required");
        setBusy(true);
        try {
            const res = await fetch("/api/tts/voices/pvc/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, language }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            update({ step: 2, voiceId: data.voice_id });
            toast.success("Voice profile created!");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to create voice");
        } finally {
            setBusy(false);
        }
    };

    // ── Step 2: Upload samples ────────────────────────────────────────────────
    const handleUpload = async () => {
        if (!audioFiles.length) return toast.error("Upload at least one audio file");
        setBusy(true);
        try {
            const formData = new FormData();
            formData.append("voice_id", wizard.voiceId!);
            audioFiles.forEach((f) => formData.append("files", f));

            const res = await fetch("/api/tts/voices/pvc/samples", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const samples: SampleState[] = (data.samples ?? []).map((s: { sample_id: string }) => ({
                sample_id: s.sample_id,
                separationStatus: "pending" as const,
                speakers: [],
                selectedSpeakerId: null,
            }));

            update({ step: 3, samples });
            toast.success("Samples uploaded — starting speaker separation…");
            await triggerSeparation(wizard.voiceId!, samples);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setBusy(false);
        }
    };

    // ── Step 3: Trigger separation then poll ──────────────────────────────────
    const triggerSeparation = async (voiceId: string, samples: SampleState[]) => {
        // Fire separate for each sample
        await Promise.all(
            samples.map((s) =>
                fetch("/api/tts/voices/pvc/separate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ voice_id: voiceId, sample_id: s.sample_id }),
                }),
            ),
        );
        startSeparationPolling(voiceId, samples);
    };

    const startSeparationPolling = (voiceId: string, samples: SampleState[]) => {
        if (separationPollRef.current) clearInterval(separationPollRef.current);

        separationPollRef.current = setInterval(async () => {
            const updated = await Promise.all(
                samples.map(async (s) => {
                    if (s.separationStatus === "completed" || s.separationStatus === "failed") return s;
                    try {
                        const res = await fetch(`/api/tts/voices/pvc/separation-status?voice_id=${voiceId}&sample_id=${s.sample_id}`);
                        const data = await res.json();
                        return {
                            ...s,
                            separationStatus: data.status as SampleState["separationStatus"],
                            speakers: data.speakers ?? s.speakers,
                        };
                    } catch {
                        return s;
                    }
                }),
            );

            const allDone = updated.every((s) => s.separationStatus === "completed" || s.separationStatus === "failed");

            setWizard((prev) => {
                const next = { ...prev, samples: updated };
                if (allDone) next.step = 4;
                saveState(next);
                return next;
            });

            if (allDone) {
                clearInterval(separationPollRef.current!);
                separationPollRef.current = null;
                toast.success("Speaker separation complete — pick your speaker");
            }
        }, 3000);
    };

    // ── Step 4: Select speaker ────────────────────────────────────────────────
    const handleSelectSpeakers = async () => {
        const allSelected = wizard.samples.every((s) => s.selectedSpeakerId);
        if (!allSelected) return toast.error("Please select a speaker for every sample");
        setBusy(true);
        try {
            await Promise.all(
                wizard.samples.map((s) =>
                    fetch("/api/tts/voices/pvc/select-speaker", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            voice_id: wizard.voiceId,
                            sample_id: s.sample_id,
                            speaker_id: s.selectedSpeakerId,
                        }),
                    }),
                ),
            );
            // Fetch captcha
            const res = await fetch(`/api/tts/voices/pvc/captcha?voice_id=${wizard.voiceId}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            update({ step: 5, captchaImage: data.image_base64 });
            toast.success("Speakers selected — verify your identity");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to select speakers");
        } finally {
            setBusy(false);
        }
    };

    const playSpeakerAudio = async (sampleId: string, speakerId: string) => {
        try {
            const res = await fetch(`/api/tts/voices/pvc/speaker-audio?voice_id=${wizard.voiceId}&sample_id=${sampleId}&speaker_id=${speakerId}`);
            const data = await res.json();
            const audio = new Audio(`data:audio/mp3;base64,${data.audio_base_64}`);
            audio.play();
        } catch {
            toast.error("Could not play audio");
        }
    };

    // ── Step 5: Captcha verification ──────────────────────────────────────────
    const handleVerify = async () => {
        if (!captchaRecording) return toast.error("Please upload your captcha recording");
        setBusy(true);
        try {
            const formData = new FormData();
            formData.append("voice_id", wizard.voiceId!);
            formData.append("recording", captchaRecording);
            const res = await fetch("/api/tts/voices/pvc/verify", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            update({ step: 6 });
            toast.success("Identity verified — ready to train!");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Verification failed");
        } finally {
            setBusy(false);
        }
    };

    // ── Step 6: Train ─────────────────────────────────────────────────────────
    const handleTrain = async () => {
        setBusy(true);
        try {
            const res = await fetch("/api/tts/voices/pvc/train", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ voice_id: wizard.voiceId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Training started — this may take a few minutes…");
            startTrainingPolling(wizard.voiceId!);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Training failed to start");
        } finally {
            setBusy(false);
        }
    };

    const startTrainingPolling = (voiceId: string) => {
        if (trainingPollRef.current) clearInterval(trainingPollRef.current);

        trainingPollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/tts/voices/pvc/training-status?voice_id=${voiceId}`);
                const data = await res.json();
                const done = data.state === "fine_tuned" || data.state === "failed";

                setWizard((prev) => {
                    const next = {
                        ...prev,
                        trainingState: data.state,
                        trainingProgress: data.progress ?? prev.trainingProgress,
                        ...(done ? { step: 7 as Step } : {}),
                    };
                    saveState(next);
                    return next;
                });

                if (done) {
                    clearInterval(trainingPollRef.current!);
                    trainingPollRef.current = null;
                    if (data.state === "fine_tuned") toast.success("🎉 Your PVC voice is ready!");
                    else toast.error("Training failed — please try again");
                }
            } catch {}
        }, 10000);
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        clearState();
        setWizard(INITIAL_STATE);
        setName("");
        setDescription("");
        setLanguage("en");
        setAudioFiles([]);
        setCaptchaRecording(null);
        if (separationPollRef.current) clearInterval(separationPollRef.current);
        if (trainingPollRef.current) clearInterval(trainingPollRef.current);
        onSuccess?.();
    };

    return (
        <div className="max-w-2xl mx-auto w-full space-y-4">
            <StepIndicator current={wizard.step} />

            {wizard.step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mic className="h-5 w-5 text-primary" /> Voice Setup
                        </CardTitle>
                        <CardDescription>Name your professional voice clone and choose its language.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="pvc-name">
                                Voice Name <span className="text-destructive">*</span>
                            </Label>
                            <Input id="pvc-name" placeholder="e.g., Sarah's Studio Voice" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pvc-lang">Language</Label>
                            <Select value={language} onValueChange={setLanguage} disabled={busy}>
                                <SelectTrigger id="pvc-lang">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        ["en", "English"],
                                        ["es", "Spanish"],
                                        ["fr", "French"],
                                        ["de", "German"],
                                        ["it", "Italian"],
                                        ["pt", "Portuguese"],
                                        ["pl", "Polish"],
                                        ["hi", "Hindi"],
                                        ["ja", "Japanese"],
                                        ["zh", "Chinese"],
                                    ].map(([val, lbl]) => (
                                        <SelectItem key={val} value={val}>
                                            {lbl}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pvc-desc">
                                Description <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                            </Label>
                            <Textarea
                                id="pvc-desc"
                                placeholder="e.g., Professional podcast voice, warm tone"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={busy}
                                className="resize-none h-20"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-end">
                        <Button onClick={handleCreate} disabled={busy || !name.trim()}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                            Continue
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {wizard.step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" /> Upload Audio Samples
                        </CardTitle>
                        <CardDescription>Upload 30+ minutes of clean audio for best results. Multiple files accepted.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FileDropZone
                            files={audioFiles}
                            onFiles={(f) => setAudioFiles((prev) => [...prev, ...f])}
                            multiple
                            accept=".mp3,.wav,.m4a,.flac,.ogg,.aac,.mp4,.mkv,.webm,.mov,
audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/flac,audio/ogg,
video/mp4,video/x-matroska,video/webm,video/quicktime"
                            label="Click or drag to upload audio/video files"
                            hint="MP3, WAV, M4A, MP4 — up to 50MB each. More audio = better clone quality."
                            maxSizeMB={50}
                            disabled={busy}
                        />
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-end">
                        <Button onClick={handleUpload} disabled={busy || audioFiles.length === 0}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                            Upload & Continue
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {wizard.step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 text-primary animate-spin" /> Separating Speakers
                        </CardTitle>
                        <CardDescription>ElevenLabs is identifying individual speakers in your audio. This usually takes under 30 seconds.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {wizard.samples.map((s) => (
                            <div key={s.sample_id} className="flex items-center justify-between rounded-lg border p-3">
                                <span className="text-sm font-mono text-muted-foreground truncate max-w-[180px]">{s.sample_id}</span>
                                <Badge variant={s.separationStatus === "completed" ? "default" : s.separationStatus === "failed" ? "destructive" : "secondary"} className="capitalize">
                                    {s.separationStatus === "pending" || s.separationStatus === "processing" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                    {s.separationStatus}
                                </Badge>
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground text-center pt-2">Polling every 3 seconds — you can safely leave and come back.</p>
                    </CardContent>
                </Card>
            )}

            {wizard.step === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Volume2 className="h-5 w-5 text-primary" /> Select Your Speaker
                        </CardTitle>
                        <CardDescription>Preview each detected speaker and select the one that is you.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {wizard.samples.map((sample, si) => (
                            <div key={sample.sample_id} className="space-y-3">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Sample {si + 1} — {sample.speakers.length} speaker{sample.speakers.length !== 1 ? "s" : ""} detected
                                </p>
                                <div className="space-y-2">
                                    {sample.speakers.map((sp) => (
                                        <div
                                            key={sp.speaker_id}
                                            className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all ${sample.selectedSpeakerId === sp.speaker_id ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                                            onClick={() => {
                                                const updated = wizard.samples.map((s, i) => (i === si ? { ...s, selectedSpeakerId: sp.speaker_id } : s));
                                                update({ samples: updated });
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`h-4 w-4 rounded-full border-2 transition-colors ${sample.selectedSpeakerId === sp.speaker_id ? "border-primary bg-primary" : "border-muted-foreground/40"}`}
                                                />
                                                <span className="text-sm font-mono">Speaker {sp.speaker_id.slice(0, 8)}…</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    playSpeakerAudio(sample.sample_id, sp.speaker_id);
                                                }}
                                            >
                                                <Volume2 className="h-4 w-4 mr-1" /> Preview
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-end">
                        <Button onClick={handleSelectSpeakers} disabled={busy || !wizard.samples.every((s) => s.selectedSpeakerId)}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                            Confirm & Continue
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {wizard.step === 5 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" /> Verify Your Identity
                        </CardTitle>
                        <CardDescription>Read the text in the image aloud, record yourself, then upload the recording below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {wizard.captchaImage && (
                            <div className="rounded-lg border bg-muted/30 p-4 flex justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`data:image/png;base64,${wizard.captchaImage}`} alt="Captcha — read this text aloud" className="max-h-48 rounded object-contain" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Upload Your Recording</Label>
                            <FileDropZone
                                files={captchaRecording ? [captchaRecording] : []}
                                onFiles={(f) => setCaptchaRecording(f[0])}
                                accept="audio/*"
                                label="Click to upload your captcha recording"
                                hint="MP3 or WAV — record yourself reading the text above"
                                maxSizeMB={20}
                                disabled={busy}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-end">
                        <Button onClick={handleVerify} disabled={busy || !captchaRecording}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                            Submit Verification
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {wizard.step === 6 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-primary" /> Train Your Voice
                        </CardTitle>
                        <CardDescription>Start training. This can take several minutes depending on audio length.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {wizard.trainingState ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground capitalize">{wizard.trainingState.replace(/_/g, " ")}</span>
                                    {wizard.trainingProgress != null && <span className="font-medium">{Math.round(wizard.trainingProgress * 100)}%</span>}
                                </div>
                                <Progress value={wizard.trainingProgress != null ? wizard.trainingProgress * 100 : undefined} className="h-2" />
                                <p className="text-xs text-muted-foreground text-center">Polling every 10 seconds — you can safely leave and come back.</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border bg-muted/30 p-5 text-center space-y-2">
                                <Wand2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm font-medium">Ready to begin training</p>
                                <p className="text-xs text-muted-foreground">ElevenLabs will fine-tune a voice model on your samples. Takes 5–30 min.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-end">
                        <Button onClick={handleTrain} disabled={busy || !!wizard.trainingState}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                            {wizard.trainingState ? "Training in progress…" : "Start Training"}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {wizard.step === 7 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" /> Voice Ready!
                        </CardTitle>
                        <CardDescription>Your professional voice clone has been trained and is ready to use.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border bg-primary/5 p-6 text-center space-y-3">
                            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                            <p className="font-semibold text-lg">🎉 Training complete!</p>
                            <p className="text-sm text-muted-foreground">
                                Your voice <span className="font-medium text-foreground">{name || "PVC Voice"}</span> is now available in the Generate Audio tab.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-end">
                        <Button onClick={handleReset}>Clone Another Voice</Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}
