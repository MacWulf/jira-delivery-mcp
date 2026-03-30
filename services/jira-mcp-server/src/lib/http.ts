export class HttpError extends Error {
  readonly status: number;
  readonly details: string;

  constructor(status: number, details: string) {
    super(`HTTP ${status}: ${details}`);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export async function requestJson<T>(
  url: string,
  init: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new HttpError(response.status, text || response.statusText);
  }

  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function basicAuthHeader(email: string, token: string): string {
  return `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;
}

