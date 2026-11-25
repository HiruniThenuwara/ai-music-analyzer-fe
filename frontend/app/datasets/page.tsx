import Link from "next/link";
import { DatasetJobs } from "@/components/dataset-jobs";
import { DatasetView } from "@/components/dataset-view";

export const metadata = { title: "Datasets" };

export default function DatasetsPage() {
  return <>
    <h1>Datasets</h1>
    <p className="intro">Configure local audio and annotation sources for research.</p>
    <p><Link href="/datasets/explorer">Open dataset explorer</Link></p>
    <div className="system-stack">
      <DatasetJobs />
      <DatasetView />
    </div>
  </>;
}
