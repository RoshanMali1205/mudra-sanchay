import type { ApiErrorBody } from "@mudra-sanchay/shared";
import { useSessionStore } from "./store";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  body?: ApiErrorBody["error"];

  constructor(status: number, message: string, body?: ApiErrorBody["error"]) {
    super(message);
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useSessionStore.getState().token;
  const headers = new Headers(init.headers);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 25000);
  if (init.signal) {
    init.signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal
    });
    const json = (await response.json().catch(() => ({}))) as { data?: T; message?: string } & ApiErrorBody;

    if (!response.ok) {
      throw new ApiError(
        response.status,
        json.error?.message ?? json.message ?? "Request failed",
        json.error
      );
    }
    return json.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "Cannot reach the API. In the project folder run pnpm dev so both the web app and API start."
    );
  } finally {
    window.clearTimeout(timer);
  }
}
