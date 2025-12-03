import type { EngineEvaluation, StockfishEvent } from "../types/engine";

const workerFactory = () => new Worker(new URL("./stockfishWorker.ts", import.meta.url), { type: "module" });

type PendingPromise = {
  resolve: (value: EngineEvaluation) => void;
  reject: (error: unknown) => void;
};

export class StockfishService {
  private worker: Worker;
  private idCounter = 0;
  private pending = new Map<string, PendingPromise>();
  private listeners = new Set<(event: StockfishEvent) => void>();

  constructor() {
    this.worker = workerFactory();
    this.worker.onmessage = (event: MessageEvent<any>) => {
      const data = event.data;
      if (data?.type === "evaluation") {
        const pending = this.pending.get(data.id);
        if (pending) {
          pending.resolve(data.payload as EngineEvaluation);
          this.pending.delete(data.id);
        }
      } else if (data?.type === "ready") {
        this.emit({ type: "ready" });
      } else if (data?.type === "error") {
        if (data.id) {
          const pending = this.pending.get(data.id);
          if (pending) {
            pending.reject(new Error(data.message ?? "Stockfish error"));
            this.pending.delete(data.id);
          }
        } else {
          this.emit({ type: "error", message: data.message });
        }
      }
    };

    this.worker.onerror = (error) => {
      this.emit({ type: "error", message: error.message ?? "Stockfish worker error" });
    };
  }

  evaluatePosition(fen: string, options: { depth?: number; movetime?: number } = {}) {
    const id = `${++this.idCounter}`;
    const payload = { fen, ...options };
    this.worker.postMessage({ type: "evaluate", id, payload });

    return new Promise<EngineEvaluation>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  subscribe(listener: (event: StockfishEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose() {
    this.worker.terminate();
    this.pending.forEach(({ reject }) => reject(new Error("Stockfish service disposed")));
    this.pending.clear();
    this.listeners.clear();
  }

  private emit(event: StockfishEvent) {
    this.listeners.forEach((listener) => listener(event));
  }
}
