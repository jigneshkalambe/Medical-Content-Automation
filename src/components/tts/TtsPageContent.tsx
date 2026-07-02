"use client";

import { TtsForm } from "@/components/tts/tts-form";
import { VoiceCloneForm } from "@/components/tts/voice-clone-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Plus } from "lucide-react";
import { useState } from "react";
import { PVCCloneForm } from "./pvc-clone-form";

export default function TtsPageContent() {
    const [cloneMode, setCloneMode] = useState<"ivc" | "pvc">("ivc");
    return (
        <div className="min-h-screen bg-background text-foreground">
            <main className="container mx-auto max-w-8xl px-4 py-8 md:py-12">
                <div className="mb-8 space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Audio Studio</h1>
                    <p className="text-lg text-muted-foreground">Generate speech or clone your own voice via ElevenLabs AI.</p>
                </div>

                <Tabs defaultValue="generate" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
                        <TabsTrigger value="generate" className="flex items-center gap-2 cursor-pointer">
                            <Mic className="h-4 w-4" />
                            Generate Audio
                        </TabsTrigger>
                        <TabsTrigger value="clone" className="flex items-center gap-2 cursor-pointer">
                            <Plus className="h-4 w-4" />
                            Clone Voice
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="generate" className="animate-in fade-in-50 duration-500">
                        <TtsForm />
                    </TabsContent>

                    <TabsContent value="clone" className="animate-in fade-in-50 duration-500">
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex rounded-lg border bg-muted p-1">
                                <button onClick={() => setCloneMode("ivc")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${cloneMode === "ivc" ? "bg-background shadow text-foreground" : "text-muted-foreground"} cursor-pointer`}>
                                    Instant Clone
                                </button>
                                <button onClick={() => setCloneMode("pvc")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${cloneMode === "pvc" ? "bg-background shadow text-foreground" : "text-muted-foreground"} cursor-pointer`}>
                                    Professional Clone
                                </button>
                            </div>
                        </div>
                        {cloneMode === "ivc" ? <VoiceCloneForm /> : <PVCCloneForm />}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
