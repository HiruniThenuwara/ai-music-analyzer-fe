"use client";

import { useEffect, useRef, useState } from "react";
import { readApiError } from "@/lib/contracts";
import { Alert } from "./workstation-ui";

type PreviewState = { state: "loading" | "ready" } | { state: "error"; message: string };

export function SampleAudio({ url, seconds }: { url: string; seconds: number }) {
  const waveform = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLAudioElement>(null);
  const [preview, setPreview] = useState<PreviewState>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    const audio = media.current;
    const container = waveform.current;
    if (!audio || !container) return;
    let player: { destroy: () => void } | undefined;

    async function load() {
      const response = await fetch(url, { signal: abort.signal, cache: "no-store" });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        throw new Error(readApiError(payload)?.error.message ?? `Audio request failed (HTTP ${response.status}).`);
      }
      const blob = await response.blob();
      const { default: WaveSurfer } = await import("wavesurfer.js");
      if (abort.signal.aborted || !audio || !container) return;
      const instance = WaveSurfer.create({
        container, media: audio, waveColor: "#8276cb", progressColor: "#d2c8ff",
        cursorColor: "#f1eaff", height: 84,
      });
      player = instance;
      try {
        await instance.loadBlob(blob);
      } catch {
        throw new Error("The browser could not decode the audio preview.");
      }
      if (!abort.signal.aborted) setPreview({ state: "ready" });
    }
    void load().catch((error: unknown) => {
      if (!abort.signal.aborted) setPreview({ state: "error", message: error instanceof Error ? error.message : "Audio preview unavailable." });
    });

    return () => {
      abort.abort();
      audio.pause();
      player?.destroy();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [url, attempt]);

  return <>
    <p>Audio preview, up to {seconds} seconds from the start of the recording.</p>
    {preview.state === "loading" && <p role="status">Loading audio and waveform.</p>}
    {preview.state === "error" && <Alert title="Audio unavailable" error>
      <p>{preview.message}</p>
      <button type="button" onClick={() => { setPreview({ state: "loading" }); setAttempt(attempt + 1); }}>Retry audio</button>
    </Alert>}
    <div className="waveform" ref={waveform} aria-hidden="true" hidden={preview.state !== "ready"} />
    <audio ref={media} className="sample-media" controls aria-label="Sample audio preview"
      hidden={preview.state !== "ready"} onError={() => {
        if (preview.state === "ready") setPreview({ state: "error", message: "The browser could not play the audio preview." });
      }} />
  </>;
}
