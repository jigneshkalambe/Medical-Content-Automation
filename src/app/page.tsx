import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Home() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-medium">
                    <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
                    Video Automation Studio
                </div>
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                    Create AI-Powered Content <br className="hidden sm:inline" />
                    at the Speed of Thought
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">A powerful suite of tools to automate video creation. Start by generating ultra-realistic AI voiceovers with ElevenLabs technology.</p>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Button asChild size="lg" className="h-12 px-8 text-base">
                        <Link href="/tts">
                            <Mic className="mr-2 h-5 w-5" />
                            Try Text-to-Speech
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                    {/* <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
                        <a href="https://elevenlabs.io/" target="_blank" rel="noreferrer">
                            Learn about ElevenLabs
                        </a>
                    </Button> */}
                </div>
            </div>
        </div>
    );
}
