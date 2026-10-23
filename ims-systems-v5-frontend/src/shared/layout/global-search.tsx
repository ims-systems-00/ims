import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/shared/lib/http";
import { SearchInput } from "@/shared/components/search-input";
import { cn } from "@/shared/lib/utils";
import { useGlobalSearchStore } from "./global-search-store";

type SearchItem = {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  route: string;
};

type SearchResults = { query: string; items: SearchItem[] };

/**
 * Navbar global search (F-07) — debounced query to GET /search.
 * Results deep-link into module sheets/detail routes (e.g. `/risks?risk=`).
 */
export function GlobalSearch() {
  const navigate = useNavigate();
  const { query, open, setQuery, setOpen, reset } = useGlobalSearchStore();

  const searchQuery = useQuery({
    queryKey: ["global-search", query.trim()],
    queryFn: () =>
      apiRequest<SearchResults>(`/search?q=${encodeURIComponent(query.trim())}`),
    enabled: open && query.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const items = searchQuery.data?.items ?? [];

  return (
    <div className="relative hidden sm:block">
      <SearchInput
        placeholder="Search"
        aria-label="Search"
        className="w-44 bg-surface-muted/50"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        onBlur={() => {
          // Delay so result clicks register first.
          setTimeout(() => setOpen(false), 150);
        }}
      />
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1.5 max-h-80 w-80 overflow-auto rounded-md border border-border bg-surface shadow-lg">
          {searchQuery.isFetching ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Searching…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              No results for “{query.trim()}”
            </p>
          ) : (
            <ul className="py-1">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                      "hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      reset();
                      navigate(item.route);
                    }}
                  >
                    <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">
                      {item.type}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.title}</span>
                      {item.subtitle ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
