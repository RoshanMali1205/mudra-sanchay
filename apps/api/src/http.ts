import type { Context } from "hono";

export function fail(
  c: Context,
  status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
  code: string,
  message: string,
  fieldErrors?: Record<string, string[] | undefined>
) {
  return c.json(
    {
      error: {
        code,
        message,
        fieldErrors,
        requestId: c.get("requestId") as string
      }
    },
    status
  );
}
