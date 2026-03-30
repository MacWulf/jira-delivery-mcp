import { z, ZodType } from "zod";

type JsonRecord = Record<string, unknown>;

export const jsonRecordSchema: ZodType<JsonRecord> = z.record(
  z.string(),
  z.unknown()
);

export function toolText(
  message: string
): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: message
      }
    ]
  };
}
