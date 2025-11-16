import { EventEmitter } from "events";
import { randomUUID } from "crypto";

export type ResultEntry = {
  id: string;
  receivedAt: string;
  sourceIp?: string | null;
  payload: unknown;
};

export type ResultStore = {
  emitter: EventEmitter;
  results: ResultEntry[];
};

declare global {
  var __yuyayResultStore: ResultStore | undefined;
}

const store: ResultStore = globalThis.__yuyayResultStore ?? {
  emitter: new EventEmitter(),
  results: [],
};

if (!globalThis.__yuyayResultStore) {
  globalThis.__yuyayResultStore = store;
}

const MAX_RESULTS = 20;

export function addResult(payload: unknown, meta?: { sourceIp?: string | null }) {
  const entry: ResultEntry = {
    id: randomUUID(),
    receivedAt: new Date().toISOString(),
    sourceIp: meta?.sourceIp ?? null,
    payload,
  };

  store.results.unshift(entry);
  if (store.results.length > MAX_RESULTS) {
    store.results.length = MAX_RESULTS;
  }

  store.emitter.emit("message", entry);
  return entry;
}

export function getResults() {
  return store.results;
}

export function subscribe(callback: (entry: ResultEntry) => void) {
  store.emitter.on("message", callback);
  return () => {
    store.emitter.off("message", callback);
  };
}
