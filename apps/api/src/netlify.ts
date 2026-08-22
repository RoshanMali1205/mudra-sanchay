import app from "./app.js";

type NetlifyEvent = {
  rawUrl?: string;
  path?: string;
  httpMethod?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
};

function rewriteApiPath(url: URL) {
  if (url.pathname.startsWith("/.netlify/functions/api")) {
    url.pathname = url.pathname.replace("/.netlify/functions/api", "/api");
  }
  return url;
}

function headersFromEvent(event: NetlifyEvent) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

function requestFromEvent(event: NetlifyEvent) {
  const headers = headersFromEvent(event);
  const host = headers.get("host") ?? "mudra-sanchay.netlify.app";
  const path = event.path ?? "/";
  const url = rewriteApiPath(new URL(event.rawUrl || `https://${host}${path}`));
  const method = event.httpMethod ?? event.method ?? "GET";
  const init: RequestInit = { method, headers };
  if (event.body && method !== "GET" && method !== "HEAD") {
    init.body = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
  }
  return new Request(url.toString(), init);
}

async function handleFetch(request: Request) {
  const url = rewriteApiPath(new URL(request.url));
  if (url.href !== request.url) {
    request = new Request(url.toString(), request);
  }
  return app.fetch(request);
}

async function toLambdaResult(response: Response) {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = headers["content-type"] ?? "";
  const binary = contentType.startsWith("image/") || contentType === "application/pdf";
  return {
    statusCode: response.status,
    headers,
    body: binary ? buffer.toString("base64") : buffer.toString("utf8"),
    isBase64Encoded: binary
  };
}

function isFetchRequest(value: unknown): value is Request {
  return Boolean(value && typeof value === "object" && "url" in value && typeof (value as Request).headers?.get === "function");
}

export async function handler(event: Request | NetlifyEvent) {
  if (isFetchRequest(event)) {
    return handleFetch(event);
  }
  return toLambdaResult(await handleFetch(requestFromEvent(event)));
}

export default handler;
