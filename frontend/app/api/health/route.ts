import { proxyHealth } from "@/lib/health-proxy";

export const dynamic = "force-dynamic";

export function GET() {
  return proxyHealth(process.env.MUSICAI_BACKEND_PORT);
}
