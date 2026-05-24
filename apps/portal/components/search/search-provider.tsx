"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

// ── Types ──────────────────────────────────────────────

interface SearchEntry {
  id: string;
  type: string;
  slug: string;
  parentSlug?: string;
  title: string;
  description: string;
  keywords: string[];
  route: string;
  extra?: Record<string, unknown>;
}

interface SearchContextValue {
  search: (query: string) => SearchEntry[];
  isReady: boolean;
}

// ── IndexedDB Helpers ──────────────────────────────────

const DB_NAME = "wikipefia-search";
const STORE_NAME = "indexes";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
}

async function idbGet(
  key: string
): Promise<{ hash: string; entries: SearchEntry[] } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(
  key: string,
  value: { hash: string; entries: SearchEntry[] }
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silent fail — cache is optional
  }
}

// ── Simple Text Search (replaces FlexSearch for bundle simplicity) ──

function createSearchIndex(entries: SearchEntry[]) {
  // Build inverted index for fast lookup
  const tokenMap = new Map<string, Set<number>>();

  entries.forEach((entry, idx) => {
    const text =
      `${entry.title} ${entry.keywords.join(" ")} ${entry.description}`.toLowerCase();
    const tokens = text.split(/\s+/).filter((t) => t.length > 1);
    for (const token of tokens) {
      // Index each prefix for forward matching
      for (let len = 2; len <= token.length; len++) {
        const prefix = token.slice(0, len);
        if (!tokenMap.has(prefix)) tokenMap.set(prefix, new Set());
        tokenMap.get(prefix)!.add(idx);
      }
    }
  });

  return {
    search(query: string, limit = 20): number[] {
      const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
      if (terms.length === 0) return [];

      // Intersection of all term matches
      let resultSet: Set<number> = new Set<number>();
      for (let i = 0; i < terms.length; i++) {
        const matches = tokenMap.get(terms[i]) || new Set<number>();
        if (i === 0) {
          resultSet = new Set<number>(matches);
        } else {
          const filtered = new Set<number>();
          for (const id of resultSet) {
            if (matches.has(id)) filtered.add(id);
          }
          resultSet = filtered;
        }
      }

      return Array.from(resultSet).slice(0, limit);
    },
  };
}

// ── Context ────────────────────────────────────────────

const SearchContext = createContext<SearchContextValue>({
  search: () => [],
  isReady: false,
});

export function useSearch() {
  return useContext(SearchContext);
}

// ── Provider ───────────────────────────────────────────

interface SearchProviderProps {
  children: ReactNode;
  locale: string;
  searchMeta: { hash: string };
}

export function SearchProvider({
  children,
  locale,
  searchMeta,
}: SearchProviderProps) {
  const [index, setIndex] = useState<ReturnType<
    typeof createSearchIndex
  > | null>(null);
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function initSearch() {
      const cacheKey = `wikipefia-search-${locale}`;

      // Check IndexedDB cache
      const cached = await idbGet(cacheKey);
      if (cached && cached.hash === searchMeta.hash) {
        const idx = createSearchIndex(cached.entries);
        setEntries(cached.entries);
        setIndex(idx);
        setIsReady(true);
        return;
      }

      // Fetch fresh index
      try {
        const res = await fetch(
          `/search/index-${locale}-${searchMeta.hash}.json`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const freshEntries: SearchEntry[] = await res.json();

        const idx = createSearchIndex(freshEntries);

        // Save to IndexedDB
        await idbSet(cacheKey, {
          hash: searchMeta.hash,
          entries: freshEntries,
        });

        setEntries(freshEntries);
        setIndex(idx);
        setIsReady(true);
      } catch (err) {
        console.warn("Search index fetch failed:", err);
        setIsReady(false);
      }
    }

    initSearch();
  }, [locale, searchMeta.hash]);

  const search = useCallback(
    (query: string): SearchEntry[] => {
      if (!index || !query.trim()) return [];
      const resultIds = index.search(query);
      return resultIds.map((id) => entries[id]);
    },
    [index, entries]
  );

  return (
    <SearchContext.Provider value={{ search, isReady }}>
      {children}
    </SearchContext.Provider>
  );
}
