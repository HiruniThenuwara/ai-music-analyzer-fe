import { useId, type ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return <section className="panel" aria-labelledby={id}><h2 id={id}>{title}</h2>{children}</section>;
}

export function Alert({ title, children, error = false }: { title: string; children: ReactNode; error?: boolean }) {
  return <div className={error ? "alert alert-error" : "alert"} role={error ? "alert" : undefined}>
    <strong>{title}</strong>{children}
  </div>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><strong>{title}</strong><p>{children}</p></div>;
}

export function SearchField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field">{label}
    <input type="search" value={value} onChange={(event) => onChange(event.currentTarget.value)} />
  </label>;
}

export function DataTable({ caption, headers, rows }: {
  caption: string;
  headers: readonly string[];
  rows: readonly { key: string; cells: readonly ReactNode[] }[];
}) {
  return <div className="table-scroll"><table>
    <caption>{caption}</caption>
    <thead><tr>{headers.map((heading) => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
    <tbody>{rows.map(({ key, cells }) => <tr key={key}>
      {cells.map((cell, index) => index === 0
        ? <th key={index} scope="row">{cell}</th>
        : <td key={index}>{cell}</td>)}
    </tr>)}</tbody>
  </table></div>;
}
