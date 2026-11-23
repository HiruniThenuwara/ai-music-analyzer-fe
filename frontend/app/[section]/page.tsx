import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SystemView } from "@/components/system-view";
import { Card, EmptyState } from "@/components/workstation-ui";
import Link from "next/link";
import { sections } from "@/lib/sections";

type Props = { params: Promise<{ section: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return sections.filter(({ slug }) => slug).map(({ slug }) => ({ section: slug }));
}

async function resolveSection(params: Props["params"]) {
  const { section } = await params;
  return sections.find(({ slug }) => slug === section) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { title } = await resolveSection(params);
  return { title };
}

export default async function SectionPage({ params }: Props) {
  const { title, description, slug, prerequisite } = await resolveSection(params);
  return (
    <>
      <h1>{title}</h1>
      <p className="intro">{description}</p>
      {slug === "settings" ? <SystemView settings /> : (
        <Card title={title + " prerequisites"}>
          <EmptyState title={title + " unavailable"}>{prerequisite}</EmptyState>
          <p><Link href="/settings">View system settings</Link></p>
        </Card>
      )}
    </>
  );
}
