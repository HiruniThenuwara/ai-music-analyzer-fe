import { proxyJobs } from "@/lib/job-proxy";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ segments?: string[] }> }) {
  return proxyJobs(request, (await params).segments ?? []);
}

export const POST = GET;
