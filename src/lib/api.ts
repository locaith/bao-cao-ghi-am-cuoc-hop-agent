import type { SummaryResult } from "./types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:18771").replace(/\/$/, "");

export async function checkBackend(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3500) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function summarizeMeeting(input: {
  token: string;
  text?: string;
  audio?: string;
  mimeType?: string;
}): Promise<SummaryResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      text: input.text,
      audio: input.audio,
      mime_type: input.mimeType,
      locale: "vi",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.detail || payload.error || "Không thể kết nối dịch vụ AI.");
  }
  return payload as SummaryResult;
}

export { API_BASE_URL };
