import * as React from "react";
import { Play, Pause, Download, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AudioPlayerProps {
    audioUrl: string | null;
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [volume, setVolume] = React.useState(1);

    React.useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            setProgress(audio.currentTime);
        };

        const updateDuration = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audio.addEventListener("timeupdate", updateProgress);
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateProgress);
            audio.removeEventListener("loadedmetadata", updateDuration);
            audio.removeEventListener("ended", handleEnded);
        };
    }, [audioUrl]);

    React.useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const togglePlayPause = () => {
        if (!audioRef.current || !audioUrl) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (value: number[]) => {
        if (audioRef.current && value[0] !== undefined) {
            audioRef.current.currentTime = value[0];
            setProgress(value[0]);
        }
    };

    const handleVolume = (value: number[]) => {
        if (value[0] !== undefined) {
            setVolume(value[0]);
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    if (!audioUrl) return null;

    return (
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
            <audio ref={audioRef} src={audioUrl} />

            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={togglePlayPause}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </Button>

                <div className="flex w-full flex-col gap-1.5">
                    <Slider value={[progress]} max={duration || 100} step={0.01} onValueChange={handleSeek} className="cursor-pointer" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                <div className=" items-center gap-2 hidden sm:flex">
                    <Volume2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Slider value={[volume]} max={1} step={0.01} onValueChange={handleVolume} className="w-20 cursor-pointer" />
                </div>

                <Button variant="ghost" size="icon" className="shrink-0" asChild>
                    <a href={audioUrl} download="generated-audio.mp3">
                        <Download className="h-4 w-4" />
                    </a>
                </Button>
            </div>
        </div>
    );
}
