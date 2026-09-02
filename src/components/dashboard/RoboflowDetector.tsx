import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanSearch, Upload, Loader2, Radio, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { detectTomatoesFn } from "@/lib/roboflow.functions";
import type { RoboflowDetectionResult } from "@/lib/roboflow.server";
import { saveDetections } from "@/lib/detection-log";
import { isFirebaseConfigured } from "@/lib/firebase-config";

const CLASS_COLORS: Record<string, string> = {
  ripe_tomato: "#ef4444",
  unripe_tomato: "#22c55e",
  blighted_tomato: "#a855f7",
};

function colorForClass(name: string) {
  return CLASS_COLORS[name] ?? "#f59e0b";
}

function prettify(name: string) {
  return name.replace(/_/g, " ");
}

export function RoboflowDetector() {
  const detect = useServerFn(detectTomatoesFn);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoboflowDetectionResult | null>(null);
  const [still, setStill] = useState<string | null>(null);
  const [liveDetect, setLiveDetect] = useState(false);
  const [intervalMs, setIntervalMs] = useState(300);
  const [fps, setFps] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const lastSaveRef = useRef(0);
  const firebaseReady = isFirebaseConfigured();

  // Pushes detections to the Realtime Database, throttled so the live loop
  // does not flood the database with near-duplicate frames.
  const persist = useCallback(
    async (detections: RoboflowDetectionResult) => {
      if (!autoSave || detections.predictions.length === 0) return;
      const now = Date.now();
      if (now - lastSaveRef.current < 2000) return;
      lastSaveRef.current = now;
      try {
        const saved = await saveDetections(detections.predictions, detections.imageWidth);
        if (saved > 0) setSavedCount((c) => c + saved);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save detections to the database.");
      }
    },
    [autoSave],
  );

  const startCamera = async () => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280 },
      });
      setStream(media);
      setCameraOn(true);
      setLiveDetect(true);
      setStill(null);
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play();
      }
    } catch {
      setError("Could not access the camera. Check browser permissions or upload an image instead.");
    }
  };

  const stopCamera = useCallback(() => {
    setLiveDetect(false);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOn(false);
  }, [stream]);

  const drawResult = useCallback(
    (detections: RoboflowDetectionResult, source: HTMLVideoElement | HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const srcW =
        source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
      const srcH =
        source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
      if (!srcW || !srcH) return;

      canvas.width = srcW;
      canvas.height = srcH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(source, 0, 0, srcW, srcH);
      const sx = srcW / detections.imageWidth;
      const sy = srcH / detections.imageHeight;

      for (const p of detections.predictions) {
        const x = (p.x - p.width / 2) * sx;
        const y = (p.y - p.height / 2) * sy;
        const w = p.width * sx;
        const h = p.height * sy;
        const color = colorForClass(p.className);

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, srcW / 300);
        ctx.strokeRect(x, y, w, h);

        const label = `${prettify(p.className)} ${(p.confidence * 100).toFixed(0)}%`;
        ctx.font = `${Math.max(14, srcW / 50)}px sans-serif`;
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(x, Math.max(0, y - 26), textW + 12, 26);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 6, Math.max(18, y - 7));
      }
    },
    [],
  );

  const analyze = async (
    imageBase64: string,
    source: HTMLVideoElement | HTMLImageElement,
    silent = false,
  ) => {
    if (!silent) setAnalyzing(true);
    setError(null);
    try {
      const detections = await detect({ data: { imageBase64 } });
      setResult(detections);
      drawResult(detections, source);
      void persist(detections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed. Please try again.");
      throw err;
    } finally {
      if (!silent) setAnalyzing(false);
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const capture = document.createElement("canvas");
    capture.width = video.videoWidth;
    capture.height = video.videoHeight;
    capture.getContext("2d")?.drawImage(video, 0, 0);
    return { video, base64: capture.toDataURL("image/jpeg", 0.7).split(",")[1] ?? "" };
  };

  const analyzeFrame = () => {
    const frame = captureFrame();
    if (!frame) return;
    void analyze(frame.base64, frame.video).catch(() => {});
  };

  // Continuous real-time loop: analyzes the newest frame as soon as the
  // previous inference resolves, throttled by the interval below.
  useEffect(() => {
    if (!liveDetect || !cameraOn) return;
    let stopped = false;

    const loop = async () => {
      while (!stopped) {
        const frame = captureFrame();
        if (frame) {
          const started = performance.now();
          try {
            await analyze(frame.base64, frame.video, true);
          } catch {
            setLiveDetect(false);
            return;
          }
          setFps(Math.round(1000 / Math.max(1, performance.now() - started)) || 0);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    };

    void loop();
    return () => {
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveDetect, cameraOn, intervalMs]);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      const img = new Image();
      img.onload = () => {
        stopCamera();
        setStill(dataUrl);
        void analyze(base64, img);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!cameraOn ? (
          <Button size="sm" onClick={startCamera} disabled={analyzing}>
            <Camera className="mr-2 h-4 w-4" />
            Start camera
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={stopCamera}>
              <CameraOff className="mr-2 h-4 w-4" />
              Stop
            </Button>
            <Button size="sm" onClick={analyzeFrame} disabled={analyzing || liveDetect}>
              {analyzing && !liveDetect ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="mr-2 h-4 w-4" />
              )}
              Analyze frame
            </Button>
            <Button
              size="sm"
              variant={liveDetect ? "destructive" : "default"}
              onClick={() => setLiveDetect((v) => !v)}
            >
              {liveDetect ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {liveDetect ? "Pause continuous" : "Continuous detect"}
            </Button>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              title="Detection interval"
            >
              <option value={0}>No pause</option>
              <option value={300}>300 ms</option>
              <option value={500}>500 ms</option>
              <option value={1000}>1 s</option>
              <option value={2000}>2 s</option>
            </select>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={analyzing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant={autoSave ? "default" : "outline"}
          onClick={() => setAutoSave((v) => !v)}
        >
          {autoSave ? <Radio className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
          {autoSave ? "Saving to database" : "Saving paused"}
        </Button>
        <Badge variant="outline" className="ml-auto text-xs font-medium">
          Model: tomato-fruit-ripeness-and-blight v1
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="relative aspect-video overflow-hidden rounded-lg bg-foreground">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cameraOn && !still ? "h-full w-full object-contain" : "hidden"}
        />
        <canvas
          ref={canvasRef}
          className={result ? "absolute inset-0 h-full w-full object-contain" : "hidden"}
        />
        {!cameraOn && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-background/80">
            <ScanSearch className="h-10 w-10 opacity-60" />
            <p className="text-sm font-medium">
              Start the camera or upload an image to run AI detection
            </p>
            <p className="text-xs text-background/50">
              Detects ripe, unripe, and blighted tomatoes using your Roboflow model
            </p>
          </div>
        )}
        {analyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
            <Loader2 className="h-8 w-8 animate-spin text-background" />
          </div>
        )}
      </div>

      {!firebaseReady && (
        <p className="text-xs text-muted-foreground">
          Firebase Realtime Database is not configured yet, so detections are not being saved. Add
          the VITE_FIREBASE_* environment variables (including VITE_FIREBASE_DATABASE_URL).
        </p>
      )}

      {result && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {result.predictions.length} detection
            {result.predictions.length === 1 ? "" : "s"} · inference in {result.inferenceTimeMs} ms
            {savedCount > 0 ? ` · ${savedCount} saved to database` : ""}
            {liveDetect && fps > 0 ? ` · ~${fps} fps` : ""}
          </p>
          {result.predictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tomatoes detected in this frame.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.predictions.map((p, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs font-medium"
                  style={{ borderColor: colorForClass(p.className), color: colorForClass(p.className) }}
                >
                  {prettify(p.className)} · {(p.confidence * 100).toFixed(0)}%
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
