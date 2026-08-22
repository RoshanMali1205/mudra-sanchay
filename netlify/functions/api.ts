import app from "../../apps/api/src/app.ts";

export default async (request: Request) => app.fetch(request);
