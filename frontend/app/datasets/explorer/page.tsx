import Link from "next/link";
import { ExplorerView } from "@/components/explorer-view";

export const metadata = { title: "Dataset explorer" };

export default function ExplorerPage() {
  return <>
    <p><Link href="/datasets">Dataset sources</Link></p>
    <h1>Dataset explorer</h1>
    <p className="intro">Inspect samples and split reports from imported manifests.</p>
    <ExplorerView />
  </>;
}
