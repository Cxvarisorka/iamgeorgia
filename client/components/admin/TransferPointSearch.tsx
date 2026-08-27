"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Finding a place in the point register.
 *
 * The list page already read a `search` parameter and filtered on the server;
 * what it lacked was anything to type into. Filtering through the URL rather
 * than local state is the same arrangement the route browser uses, for the
 * same reason: the work stays on the server, and a filtered view is a link
 * somebody can send.
 *
 * Debounced, because each change is a navigation and therefore a request — a
 * keystroke should not be one.
 */
export function TransferPointSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    const current = searchParams.get("search") ?? "";
    if (search === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);

      if (search.trim()) next.set("search", search.trim());
      else next.delete("search");

      router.push(`${pathname}?${next}`);
    }, 350);

    return () => clearTimeout(timer);
    // `router` and `pathname` are stable for the life of this screen, and
    // including them would rebuild the timer for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, searchParams]);

  return (
    <label className="relative block max-w-md">
      <Search
        size={15}
        className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-subtle"
        aria-hidden
      />
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search a place, a region or an airport code"
        aria-label="Search pick-up points"
        className="h-10 w-full rounded-sm border border-line bg-surface ps-9 pe-3 text-[0.875rem] text-ink focus:border-ink focus:outline-none"
      />
    </label>
  );
}
