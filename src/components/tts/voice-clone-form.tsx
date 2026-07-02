"use client";

import { UploadCloud, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChangeEvent, FormEvent, useRef, useState } from "react";

interface VoiceCloneFormProps {
    onSuccess?: () => void;
}

export function VoiceCloneForm({ onSuccess }: VoiceCloneFormProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error("File size must be under 10MB");
                return;
            }
            if (!selectedFile.type.startsWith("audio/")) {
                toast.error("Please select a valid audio file (.mp3, .wav, etc.)");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Please enter a voice name.");
            return;
        }
        if (!file) {
            toast.error("Please upload an audio sample.");
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("description", description);
            formData.append("file", file);

            const response = await fetch("/api/tts/voices/clone", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to clone voice");
            }

            toast.success("Voice successfully cloned!");
            setName("");
            setDescription("");
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error(error);
                toast.error(error.message || "An unexpected error occurred.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto w-full">
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        Clone Voice
                    </CardTitle>
                    <CardDescription>Upload an audio sample to create a custom AI voice clone via ElevenLabs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="voice-name">
                            Voice Name <span className="text-destructive">*</span>
                        </Label>
                        <Input id="voice-name" placeholder="e.g., John's Podcast Voice" value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="voice-desc">
                            Description <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                        </Label>
                        <Textarea id="voice-desc" placeholder="e.g., Casual tone, recorded with dynamic mic" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} className="resize-none h-20" />
                    </div>

                    <div className="space-y-2">
                        <Label>
                            Audio Sample <span className="text-destructive">*</span>
                        </Label>
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-8 text-center transition hover:bg-muted/50 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".mp3,.wav,.m4a,.flac,.ogg,.aac,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/flac,audio/ogg,audio/aac" onChange={handleFileChange} disabled={isSubmitting} />

                            {file ? (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">{file.name}</div>
                                    <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="mt-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        Remove File
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2 place-items-center">
                                    <UploadCloud className="h-8 w-8 text-muted-foreground mb-4" />
                                    <div className="text-sm font-medium">Click to upload an audio file</div>
                                    <div className="text-xs text-muted-foreground">
                                        MP3, WAV, or M4A up to 10MB.
                                        <br />A clear 1-minute audio sample without background noise yields the best results.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/30 px-6 py-4 border-t flex justify-end">
                    <Button type="submit" disabled={isSubmitting || !name || !file}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Cloning Voice...
                            </>
                        ) : (
                            "Clone Voice"
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
