import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, ScanSearch, Upload, Loader2, Radio, Square, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { detectTomatoesFn } from "@/lib/roboflow.functions";
import type { RoboflowDetectionResult } from "@/lib/roboflow.server";
import { saveDetections } from "@/lib/detection-log";
import { isFirebaseConfigured } from "@/lib/firebase-config";
import {
  CLASS_META,
  TomatoTracker,
  pickFocus,
  verifyDetections,
  type Track,
} from "@/lib/tomato-vision";

const ROI = { x0: 0.08, y0: 0.12, x1: 0.92, y1: 0.95 };

export function RoboflowDetector() {
  const detect = useServerFn(detectTomatoesFn);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const trackerRef = useRef(new TomatoTracker());

  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [focus, setFocus] = useState<Track | null>(null);
  const [trackCount, setTrackCount] = useState(0);
  const [liveDetect, setLiveDetect] = useState(false);
  const [intervalMs, setIntervalMs] = useState(300);
  const [fps, setFps] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [inferenceMs, setInferenceMs] = useState(0);
  const [gatePosition, setGatePosition] = useState(0.5);
  const [gateTolerance, setGateTolerance] = useState(0.06);
  const [roiOn, setRoiOn] = useState(false);

  const roiOnRef = useRef(roiOn);
  const gateRef = useRef({ position: gatePosition, tolerance: gateTolerance });
  const autoSaveRef = useRef(autoSave);
  useEffect(() => {
    roiOnRef.current = roiOn;
  }, [roiOn]);
  useEffect(() => {
    gateRef.current = { position: gatePosition, tolerance: gateTolerance };
  }, [gatePosition, gateTolerance]);
  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  const firebaseReady = isFirebaseConfigured();

  /** Persists a tomato exactly once, at the moment it passes the gate line. */
  const persistCounted = useCallback(async (tracks: Track[], srcW: number) => {
    if (!autoSaveRef.current || tracks.length === 0) return;
    try {
      const saved = await saveDetections(
        tracks.map((t) => ({
          x: t.box.x,
          y: t.box.y,
          width: t.box.width,
          height: t.box.height,
          confidence: t.confidence,
          className: t.className,
        })),
        srcW,
      );
      if (saved > 0) setSavedCount((c) => c + saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save detections to the database.");
    }
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: 1280 },
      });
      setStream(media);
      setCameraOn(true);
      setLiveDetect(true);
      trackerRef.current.reset();
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
    setFocus(null);
    trackerRef.current.reset();
  }, [stream]);

  /** Draws the frame, ROI, gate line and the single focused tomato HUD. */
  const draw = useCallback(
    (
      source: HTMLVideoElement | HTMLImageElement,
      srcW: number,
      srcH: number,
      active: Track | null,
    ) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !srcW || !srcH) return;
      canvas.width = srcW;
      canvas.height = srcH;
      ctx.drawImage(source, 0, 0, srcW, srcH);

      const unit = Math.max(2, srcW / 400);

      if (roiOnRef.current) {
        ctx.save();
        ctx.strokeStyle = "rgba(56,189,248,0.9)";
        ctx.setLineDash([unit * 4, unit * 4]);
        ctx.lineWidth = unit;
        ctx.strokeRect(ROI.x0 * srcW, ROI.y0 * srcH, (ROI.x1 - ROI.x0) * srcW, (ROI.y1 - ROI.y0) * srcH);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(56,189,248,0.95)";
        ctx.font = `${Math.max(12, srcW / 60)}px sans-serif`;
        ctx.fillText("CONVEYOR ROI", ROI.x0 * srcW + unit * 3, ROI.y0 * srcH - unit * 2);
        ctx.restore();
      }

      // Counting gate line + tolerance band.
      const gx = gateRef.current.position * srcW;
      const band = gateRef.current.tolerance * srcW;
      ctx.save();
      ctx.fillStyle = "rgba(250,204,21,0.12)";
      ctx.fillRect(gx - band, 0, band * 2, srcH);
      ctx.strokeStyle = "#facc15";
      ctx.setLineDash([unit * 6, unit * 5]);
      ctx.lineWidth = unit * 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, srcH);
      ctx.stroke();
      ctx.restore();

      if (!active) {
        ctx.save();
        ctx.font = `bold ${Math.max(16, srcW / 34)}px sans-serif`;
        const text = "NO TOMATO DETECTED";
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = "rgba(15,23,42,0.72)";
        ctx.fillRect(srcW / 2 - tw / 2 - unit * 6, srcH / 2 - unit * 16, tw + unit * 12, unit * 24);
        ctx.fillStyle = "#f8fafc";
        ctx.fillText(text, srcW / 2 - tw / 2, srcH / 2 + unit * 2);
        ctx.restore();
        return;
      }

      const meta = CLASS_META[active.kind];
      const x = active.box.x - active.box.width / 2;
      const y = active.box.y - active.box.height / 2;
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = unit * 1.6;
      ctx.strokeRect(x, y, active.box.width, active.box.height);

      const label = `${active.label}  ${meta.label}  ${(active.confidence * 100).toFixed(0)}%${
        active.counted ? "  [COUNTED]" : ""
      }`;
      const fontSize = Math.max(13, srcW / 46);
      ctx.font = `bold ${fontSize}px sans-serif`;
      const tw = ctx.measureText(label).width;
      const boxH = fontSize * 1.7;
      const ly = Math.max(0, y - boxH);
      ctx.fillStyle = meta.color;
      ctx.fillRect(x, ly, tw + unit * 8, boxH);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + unit * 4, ly + fontSize * 1.2);
    },
    [],
  );

  const analyze = useCallback(
    async (
      imageBase64: string,
      source: HTMLVideoElement | HTMLImageElement,
      srcW: number,
      srcH: number,
      silent = false,
    ) => {
      if (!silent) setAnalyzing(true);
      setError(null);
      try {
        const detections: RoboflowDetectionResult = await detect({ data: { imageBase64 } });
        setInferenceMs(detections.inferenceTimeMs);

        const verified = verifyDetections(
          detections.predictions,
          detections.imageWidth,
          detections.imageHeight,
          source,
          srcW,
          srcH,
          { roi: roiOnRef.current ? ROI : null },
        );

        const { tracks, counted } = trackerRef.current.update(verified, srcW, gateRef.current);
        const active = pickFocus(tracks);
        setFocus(active);
        setTrackCount(tracks.length);
        setHasFrame(true);
        draw(source, srcW, srcH, active);
        if (counted.length) void persistCounted(counted, srcW);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Detection failed. Please try again.");
        throw err;
      } finally {
        if (!silent) setAnalyzing(false);
      }
    },
    [detect, draw, persistCounted],
  );

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const capture = document.createElement("canvas");
    capture.width = video.videoWidth;
    capture.height = video.videoHeight;
    capture.getContext("2d")?.drawImage(video, 0, 0);
    return {
      video,
      w: video.videoWidth,
      h: video.videoHeight,
      base64: capture.toDataURL("image/jpeg", 0.7).split(",")[1] ?? "",
    };
  };

  const analyzeFrame = () => {
    const frame = captureFrame();
    if (!frame) return;
    void analyze(frame.base64, frame.video, frame.w, frame.h).catch(() => {});
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
            await analyze(frame.base64, frame.video, frame.w, frame.h, true);
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
  }, [liveDetect, cameraOn, intervalMs, analyze]);

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.split(",")[1] ?? "";
      const img = new Image();
      img.onload = () => {
        stopCamera();
        trackerRef.current.reset();
        void analyze(base64, img, img.naturalWidth, img.naturalHeight);
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
              {liveDetect ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
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
        <Button size="sm" variant={autoSave ? "default" : "outline"} onClick={() => setAutoSave((v) => !v)}>
          {autoSave ? <Radio className="mr-2 h-4 w-4" /> : <Square className="mr-2 h-4 w-4" />}
          {autoSave ? "Saving to database" : "Saving paused"}
        </Button>
        <Button size="sm" variant={roiOn ? "default" : "outline"} onClick={() => setRoiOn((v) => !v)}>
          {roiOn ? "Conveyor ROI on" : "Conveyor ROI off"}
        </Button>
        <Badge variant="outline" className="ml-auto text-xs font-medium">
          Model: tomato-fruit-ripeness-and-blight v1
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-2">
          Gate line
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={gatePosition}
            onChange={(e) => setGatePosition(Number(e.target.value))}
          />
          <span className="tabular-nums">{Math.round(gatePosition * 100)}%</span>
        </label>
        <label className="flex items-center gap-2">
          Tolerance
          <input
            type="range"
            min={0.02}
            max={0.2}
            step={0.01}
            value={gateTolerance}
            onChange={(e) => setGateTolerance(Number(e.target.value))}
          />
          <span className="tabular-nums">±{Math.round(gateTolerance * 100)}%</span>
        </label>
        <span>Active tracks: {trackCount}</span>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="relative aspect-video overflow-hidden rounded-lg bg-foreground">
        <video ref={videoRef} playsInline muted className="hidden" />
        <canvas
          ref={canvasRef}
          className={hasFrame ? "absolute inset-0 h-full w-full object-contain" : "hidden"}
        />
        {!cameraOn && !hasFrame && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-background/80">
            <ScanSearch className="h-10 w-10 opacity-60" />
            <p className="text-sm font-medium">
              Start the camera or upload an image to run AI detection
            </p>
            <p className="text-xs text-background/50">
              Single-tomato focus mode with pixel-level verification and conveyor counting
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

      {hasFrame && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {focus ? `Focused ${focus.label}` : "No tomato detected"} · inference in {inferenceMs} ms
            {savedCount > 0 ? ` · ${savedCount} counted & saved` : ""}
            {liveDetect && fps > 0 ? ` · ~${fps} fps` : ""}
          </p>
          {focus && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="text-xs font-semibold"
                style={{ borderColor: CLASS_META[focus.kind].color, color: CLASS_META[focus.kind].color }}
              >
                {CLASS_META[focus.kind].label} · {(focus.confidence * 100).toFixed(0)}%
              </Badge>
              {focus.counted && (
                <Badge variant="outline" className="text-xs font-semibold">
                  COUNTED
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
