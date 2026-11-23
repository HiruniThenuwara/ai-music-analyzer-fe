"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/lib/api";

function useHealth() {
  return useQuery({
    queryKey: ["backend-health"],
    queryFn: ({ signal }) => fetchHealth(signal),
    retry: false,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function HealthIndicator() {
  const health = useHealth();
  const state = health.isPending ? "loading" : health.isError ? "offline" : "connected";
  const label = { loading: "Checking backend", offline: "Backend offline", connected: "Backend connected" };
  return <span className="health" role="status"><span className={`dot ${state}`} />{label[state]}</span>;
}

export function HealthPanel() {
  const health = useHealth();
  return (
    <section className="panel" aria-labelledby="backend-title">
      <div className="panel-heading"><h2 id="backend-title">Backend health</h2><HealthIndicator /></div>
      <p>{health.isPending ? "Waiting for the health endpoint." : health.isError
        ? "The local backend did not return a usable health response."
        : "The local backend health endpoint is responding."}</p>
      <button type="button" onClick={() => void health.refetch()} disabled={health.isFetching}>
        {health.isFetching ? "Checking..." : "Check again"}
      </button>
    </section>
  );
}
