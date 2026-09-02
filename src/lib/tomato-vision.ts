// Client-side optical verification + tracking utilities for the tomato line.
// Pure browser code (uses a scratch canvas) — never imported on the server.

import type { RoboflowPrediction } from "./roboflow.server";

export type TomatoClass = "ripe" | "unripe" | "blight";

export interface Box {
  x: number; // centre x, in source pixels
  y: number; // centre y, in source pixels
  width: number;
  height: number;
}

export interface VerifiedDetection extends RoboflowPrediction {
  /** Box already scaled into source-image pixel space. */
  box: Box;
  kind: TomatoClass;
  tomatoFraction: number;
  rejectFraction: number;
}

export function classify(className: string): TomatoClass {
  const n = className.toLowerCase();
  if (n.includes("blight") || n.includes("disease") || n.includes("rot")) return "blight";
  if (n.includes("unripe") || n.includes("green")) return "unripe";
  return "ripe";
}

export const CLASS_META: Record<TomatoClass, { label: string; color: string }> = {
  ripe: { label: "RIPE TOMATO", color: "#10b981" },
  unripe: { label: "UNRIPE TOMATO", color: "#84cc16" },
  blight: { label: "BLIGHT / DISEASED", color: "#dc2626" },
};

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

export interface PixelStats {
  /** Fraction of pixels matching genuine tomato pericarp colour. */
  tomatoFraction: number;
  /** Fraction matching skin / wood / cloth-like distractors. */
  rejectFraction: number;
  /** Fraction of dark necrotic-lesion pixels. */
  lesionFraction: number;
}

const SCRATCH_SIZE = 40;
let scratch: HTMLCanvasElement | null = null;

function getScratch() {
  if (!scratch) {
    scratch = document.createElement("canvas");
    scratch.width = SCRATCH_SIZE;
    scratch.height = SCRATCH_SIZE;
  }
  return scratch;
}

/** Samples the pixels inside a bounding box and scores them botanically. */
export function samplePixels(
  source: CanvasImageSource,
  box: Box,
  srcW: number,
  srcH: number,
): PixelStats {
  const canvas = getScratch();
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { tomatoFraction: 0, rejectFraction: 1, lesionFraction: 0 };

  // Sample the central 80% of the box so background edges don't dominate.
  const w = Math.max(2, box.width * 0.8);
  const h = Math.max(2, box.height * 0.8);
  const sx = Math.max(0, Math.min(srcW - 2, box.x - w / 2));
  const sy = Math.max(0, Math.min(srcH - 2, box.y - h / 2));
  const sw = Math.min(w, srcW - sx);
  const sh = Math.min(h, srcH - sy);

  ctx.clearRect(0, 0, SCRATCH_SIZE, SCRATCH_SIZE);
  try {
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, SCRATCH_SIZE, SCRATCH_SIZE);
  } catch {
    return { tomatoFraction: 0, rejectFraction: 1, lesionFraction: 0 };
  }

  const { data } = ctx.getImageData(0, 0, SCRATCH_SIZE, SCRATCH_SIZE);
  let total = 0;
  let tomato = 0;
  let reject = 0;
  let lesion = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const { h, s, v } = rgbToHsv(r, g, b);
    total++;

    const redFruit = (h <= 22 || h >= 338) && s >= 0.45 && v >= 0.18 && r > g * 1.35 && r > b * 1.35;
    const greenFruit = h >= 65 && h <= 165 && s >= 0.3 && v >= 0.15 && g > r * 1.12 && g > b * 1.1;
    // Skin / wood / warm cloth: warm hue but washed out, or r>g>b gradient.
    const skinLike =
      h >= 8 && h <= 50 && s >= 0.1 && s < 0.45 && v >= 0.25 && r > g && g > b;
    const woodLike = h >= 15 && h <= 45 && s >= 0.25 && s < 0.6 && v >= 0.15 && v < 0.7;
    const greyLike = s < 0.12;
    const darkLesion = v < 0.28 && s < 0.6;

    if (redFruit || greenFruit) tomato++;
    else if (skinLike || woodLike || greyLike) reject++;
    if (darkLesion) lesion++;
  }

  return {
    tomatoFraction: total ? tomato / total : 0,
    rejectFraction: total ? reject / total : 1,
    lesionFraction: total ? lesion / total : 0,
  };
}

export interface VerifyOptions {
  minConfidence?: number;
  roi?: { x0: number; y0: number; x1: number; y1: number } | null; // normalised 0..1
}

/**
 * Two-stage verification: model prediction first, then pixel-level botanical
 * check that rejects skin, hair, clothing, wood and shadow false positives.
 */
export function verifyDetections(
  predictions: RoboflowPrediction[],
  modelW: number,
  modelH: number,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  options: VerifyOptions = {},
): VerifiedDetection[] {
  const minConfidence = options.minConfidence ?? 0.4;
  const scaleX = modelW ? srcW / modelW : 1;
  const scaleY = modelH ? srcH / modelH : 1;
  const out: VerifiedDetection[] = [];

  for (const p of predictions) {
    if (p.confidence < minConfidence) continue;
    const box: Box = {
      x: p.x * scaleX,
      y: p.y * scaleY,
      width: p.width * scaleX,
      height: p.height * scaleY,
    };

    // Reject implausible shapes — tomatoes are roughly round.
    const ratio = box.width / Math.max(1, box.height);
    if (ratio < 0.55 || ratio > 1.8) continue;
    // Reject boxes covering most of the frame (walls, doors, torso shots).
    if (box.width * box.height > srcW * srcH * 0.6) continue;

    if (options.roi) {
      const nx = box.x / srcW;
      const ny = box.y / srcH;
      const { x0, y0, x1, y1 } = options.roi;
      if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
    }

    const stats = samplePixels(source, box, srcW, srcH);
    const kind = classify(p.className);

    if (stats.rejectFraction > 0.55) continue;
    if (kind === "blight") {
      // Contextual pathology: a lesion only counts inside a real fruit body.
      if (stats.tomatoFraction < 0.22 || stats.lesionFraction < 0.03) continue;
    } else if (stats.tomatoFraction < 0.3) {
      continue;
    }

    out.push({
      ...p,
      box,
      kind,
      tomatoFraction: stats.tomatoFraction,
      rejectFraction: stats.rejectFraction,
    });
  }

  return out;
}

export function iou(a: Box, b: Box) {
  const ax0 = a.x - a.width / 2;
  const ay0 = a.y - a.height / 2;
  const ax1 = a.x + a.width / 2;
  const ay1 = a.y + a.height / 2;
  const bx0 = b.x - b.width / 2;
  const by0 = b.y - b.height / 2;
  const bx1 = b.x + b.width / 2;
  const by1 = b.y + b.height / 2;
  const iw = Math.min(ax1, bx1) - Math.max(ax0, bx0);
  const ih = Math.min(ay1, by1) - Math.max(ay0, by0);
  if (iw <= 0 || ih <= 0) return 0;
  const inter = iw * ih;
  return inter / (a.width * a.height + b.width * b.height - inter);
}

export interface Track {
  id: number;
  label: string; // "#T1"
  box: Box;
  kind: TomatoClass;
  confidence: number;
  className: string;
  counted: boolean;
  missed: number;
  lastNormX: number;
}

export interface TrackerUpdate {
  tracks: Track[];
  /** Tracks that crossed the gate line during this update. */
  counted: Track[];
}

/** Centroid + IoU tracker with a single-pass conveyor counting gate. */
export class TomatoTracker {
  private tracks: Track[] = [];
  private nextId = 1;

  reset() {
    this.tracks = [];
    this.nextId = 1;
  }

  update(
    detections: VerifiedDetection[],
    srcW: number,
    gate: { position: number; tolerance: number } | null,
    maxMissed = 2,
  ): TrackerUpdate {
    const unmatched = new Set(this.tracks.map((t) => t.id));
    const counted: Track[] = [];

    for (const det of detections) {
      let best: Track | null = null;
      let bestScore = 0;
      for (const track of this.tracks) {
        if (!unmatched.has(track.id)) continue;
        const overlap = iou(track.box, det.box);
        const dist = Math.hypot(track.box.x - det.box.x, track.box.y - det.box.y);
        const near = dist < Math.max(det.box.width, det.box.height) * 0.9 ? 0.35 : 0;
        const score = overlap + near;
        if (score > bestScore) {
          bestScore = score;
          best = track;
        }
      }

      if (best && bestScore > 0.25) {
        unmatched.delete(best.id);
        best.lastNormX = best.box.x / Math.max(1, srcW);
        best.box = det.box;
        best.kind = det.kind;
        best.confidence = det.confidence;
        best.className = det.className;
        best.missed = 0;
      } else {
        const id = this.nextId++;
        this.tracks.push({
          id,
          label: `#T${id}`,
          box: det.box,
          kind: det.kind,
          confidence: det.confidence,
          className: det.className,
          counted: false,
          missed: 0,
          lastNormX: det.box.x / Math.max(1, srcW),
        });
      }
    }

    for (const track of this.tracks) {
      if (unmatched.has(track.id)) track.missed++;
    }
    this.tracks = this.tracks.filter((t) => t.missed <= maxMissed);

    if (gate) {
      for (const track of this.tracks) {
        if (track.counted) continue;
        const nx = track.box.x / Math.max(1, srcW);
        const withinBand = Math.abs(nx - gate.position) <= gate.tolerance;
        const crossed =
          (track.lastNormX < gate.position && nx >= gate.position) ||
          (track.lastNormX > gate.position && nx <= gate.position);
        if (withinBand || crossed) {
          track.counted = true;
          counted.push(track);
        }
      }
    }

    return { tracks: [...this.tracks], counted };
  }
}

/** Focus mode: the single largest (most visible) tomato in the frame. */
export function pickFocus(tracks: Track[]): Track | null {
  let best: Track | null = null;
  let bestArea = 0;
  for (const t of tracks) {
    const area = t.box.width * t.box.height * (0.6 + 0.4 * t.confidence);
    if (area > bestArea) {
      bestArea = area;
      best = t;
    }
  }
  return best;
}
