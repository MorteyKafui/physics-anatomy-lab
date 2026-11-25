import Link from "next/link";
import type { ReactNode } from "react";

/** A message's **bold** words and [links](/path), rendered. Links stay on this site. */
export function rich(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let at = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > at) out.push(text.slice(at, m.index));
    if (m[1]) out.push(<b key={m.index}>{m[1]}</b>);
    else
      out.push(
        <Link key={m.index} prefetch={false} href={m[3]!} className="underline">
          {m[2]}
        </Link>,
      );
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}
