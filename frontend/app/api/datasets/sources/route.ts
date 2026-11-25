import { proxyDatasets } from "@/lib/dataset-proxy";

export const dynamic = "force-dynamic";

export function GET() {
  return proxyDatasets();
}
