"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Voice } from "@/types/tts"

interface VoiceSelectorProps {
    voices: Voice[];
    selectedId: string;
    onSelect: (id: string) => void;
    isLoading?: boolean;
}

export function VoiceSelector({ voices, selectedId, onSelect, isLoading }: VoiceSelectorProps) {
    const [open, setOpen] = React.useState(false)

    const selectedVoice = voices.find((v) => v.voice_id === selectedId)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={isLoading}
                >
                    {isLoading ? "Loading voices..." : selectedVoice ? selectedVoice.name : "Select a voice..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search voice..." />
                    <CommandList>
                        <CommandEmpty>No voice found.</CommandEmpty>
                        <CommandGroup>
                            {voices.map((voice) => (
                                <CommandItem
                                    key={voice.voice_id}
                                    value={voice.name}
                                    onSelect={() => {
                                        onSelect(voice.voice_id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedId === voice.voice_id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{voice.name}</span>
                                        {voice.description && (
                                            <span className="text-xs text-muted-foreground line-clamp-1">
                                                {voice.description}
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
