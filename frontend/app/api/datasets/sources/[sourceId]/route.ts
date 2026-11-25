import { proxyDatasets } from "@/lib/dataset-proxy";

export async function PUT(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  return proxyDatasets(request, sourceId);
}
