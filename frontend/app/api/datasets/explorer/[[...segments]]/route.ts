import { proxyExplorer } from "@/lib/explorer-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ segments?: string[] }> }) {
  return proxyExplorer(request, (await params).segments ?? []);
}
