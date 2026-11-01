import type { Routed } from "./types";
import type { RouteJob } from "./worker";

/** Route in a Web Worker; resolves with the routed lines. */
export function routeInWorker(job: RouteJob): Promise<{ routed: Routed[]; ms: number }> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      resolve(e.data);
      w.terminate();
    };
    w.onerror = (e) => {
      reject(new Error(e.message));
      w.terminate();
    };
    w.postMessage(job);
  });
}
