"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchSystem, SystemQueryError } from "@/lib/api";

export function useSystem() {
  return useQuery({
    queryKey: ["system"],
    queryFn: ({ signal }) => fetchSystem(signal),
    retry: false,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function HealthIndicator() {
  const query = useSystem();
  const code = query.error instanceof SystemQueryError ? query.error.code : undefined;
  const label = query.isPending ? "Checking backend"
    : !query.isError ? "Backend connected"
    : code === "BACKEND_UNAVAILABLE" ? "Backend offline"
    : code === "corrupt_metadata" || code === "storage_unavailable" ? "Backend connected, storage error"
    : "Backend status unavailable";
  const state = query.isPending ? "loading" : query.isError ? "offline" : "connected";
  return <span className="health" role="status"><span className={`dot ${state}`} aria-hidden="true" />{label}</span>;
}
