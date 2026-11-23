import { proxySystem } from "@/lib/system-proxy";

export const dynamic = "force-dynamic";

export function GET() {
  return proxySystem(process.env.MUSICAI_BACKEND_PORT, fetch, true);
}
