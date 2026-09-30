import { describe, expect, it } from "vitest";
import { readSupabaseKeyRole } from "../src/supabase.js";

function fakeJwt(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role, ref: "demo" })).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("readSupabaseKeyRole", () => {
  it("reads service_role from a JWT-shaped key", () => {
    expect(readSupabaseKeyRole(fakeJwt("service_role"))).toBe("service_role");
  });

  it("detects anon keys so shared-project misconfig can be rejected", () => {
    expect(readSupabaseKeyRole(fakeJwt("anon"))).toBe("anon");
  });

  it("returns null for missing or malformed keys", () => {
    expect(readSupabaseKeyRole(undefined)).toBeNull();
    expect(readSupabaseKeyRole("not-a-jwt")).toBeNull();
  });
});
