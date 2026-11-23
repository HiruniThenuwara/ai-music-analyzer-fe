"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { groups, sections } from "@/lib/sections";

export function Navigation() {
  const current = usePathname();
  return (
    <nav aria-label="Research workstation">
      {groups.map((group) => (
        <section className="nav-group" key={group} aria-label={group}>
          <p>{group}</p>
          <ul>
            {sections.filter((section) => section.group === group).map(({ slug, title, icon: Icon }) => {
              const href = `/${slug}`;
              return (
                <li key={slug}>
                  <Link href={href} aria-current={current === href ? "page" : undefined}>
                    <Icon size={17} aria-hidden="true" />{title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
