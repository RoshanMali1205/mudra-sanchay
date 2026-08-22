import app from "./app.js";

export default async function handler(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/.netlify/functions/api")) {
    url.pathname = url.pathname.replace("/.netlify/functions/api", "/api");
    request = new Request(url.toString(), request);
  }
  return app.fetch(request);
}
