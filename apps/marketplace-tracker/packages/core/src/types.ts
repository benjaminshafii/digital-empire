export interface Query {
  id: string;
  name: string;
  searchTerms: string[];
  maxPrice: number;
  location: string;
  createdAt: string;
  lastRun: string | null;
}

export interface Item {
  id: string;
  queryId: string;
  title: string;
  price: string;
  link: string;
  location: string;
  firstSeen: string;
  status: "new" | "seen" | "contacted" | "purchased" | "hidden";
}

export interface SearchResult {
  text: string;
  price: string;
  link: string;
}

export interface RunnerOptions {
  serverUrl?: string;
  timeout?: number;
}
