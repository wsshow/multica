import { z } from "zod";
import { parseWithFallback } from "../api/schema";

const RuntimeReleaseSchema = z.object({ tag_name: z.string() });

export function parseRuntimeRelease(data: unknown): { tag_name: string } {
  return parseWithFallback(data, RuntimeReleaseSchema, { tag_name: "" }, {
    endpoint: "configured runtime release source",
  });
}
