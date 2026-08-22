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

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = (await response.json().catch(() => ({}))) as { data?: T } & ApiErrorBody;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      json.error?.message ?? "Request failed",
      json.error
    );
  }
  return json.data as T;
}
