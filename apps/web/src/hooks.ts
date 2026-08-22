import { useQuery } from "@tanstack/react-query";
import type { Business, SessionUser } from "@mudra-sanchay/shared";
import { api } from "./api";
import { useSessionStore } from "./store";

export function useMe() {
  const token = useSessionStore((state) => state.token);
  return useQuery({
    queryKey: ["me", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => api<{ user: SessionUser; business: Business | null }>("/me")
  });
}
