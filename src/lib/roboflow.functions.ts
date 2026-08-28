import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { detectTomatoes } from "./roboflow.server";

const DetectInput = z.object({
  // base64-encoded image payload (no data: prefix), capped ~8 MB
  imageBase64: z.string().min(16).max(12_000_000),
});

export const detectTomatoesFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DetectInput.parse(input))
  .handler(async ({ data }) => {
    return detectTomatoes(data.imageBase64);
  });
