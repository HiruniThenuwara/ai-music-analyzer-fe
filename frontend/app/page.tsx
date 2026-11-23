import { SystemView } from "@/components/system-view";

export default function Dashboard() {
  return <>
    <h1>Dashboard</h1>
    <p className="intro">Monitor the local research workstation.</p>
    <SystemView />
  </>;
}
