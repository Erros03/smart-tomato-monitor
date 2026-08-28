// Server-side Roboflow hosted inference helper.
// Only imported from *.functions.ts handlers — never from client code.

export interface RoboflowPrediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  className: string;
}

export interface RoboflowDetectionResult {
  inferenceTimeMs: number;
  imageWidth: number;
  imageHeight: number;
  predictions: RoboflowPrediction[];
}

const MODEL_PROJECT = "tomato-fruit-ripeness-and-blight";
const MODEL_VERSION = "1";

export async function detectTomatoes(
  base64Image: string,
): Promise<RoboflowDetectionResult> {
  const apiKey = process.env["ROBOFLOW_API_KEY"];
  if (!apiKey) {
    throw new Error("ROBOFLOW_API_KEY is not configured");
  }

  const url = `https://detect.roboflow.com/${MODEL_PROJECT}/${MODEL_VERSION}?api_key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: base64Image,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Roboflow request failed [${response.status}]: ${errorBody}`);
    throw new Error(`Roboflow request failed [${response.status}]: ${errorBody}`);
  }

  const data = (await response.json()) as {
    time: number;
    image: { width: number; height: number };
    predictions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      confidence: number;
      class: string;
    }>;
  };

  return {
    inferenceTimeMs: Math.round(data.time * 1000),
    imageWidth: data.image.width,
    imageHeight: data.image.height,
    predictions: data.predictions.map((p) => ({
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
      confidence: p.confidence,
      className: p.class,
    })),
  };
}
