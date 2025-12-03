/// <reference lib="webworker" />
import StockfishFactory from "stockfish.wasm";
import type { StockfishModule } from "stockfish.wasm";
import wasmUrl from "stockfish.wasm/stockfish.wasm?url";
import pthreadWorkerUrl from "stockfish.wasm/stockfish.worker.js?url";
import stockfishMainScriptUrl from "stockfish.wasm/stockfish.js?url";
import type { EngineScore } from "../types/engine";

interface StockfishInstance {
  addMessageListener(handler: (line: string) => void): void;
  removeMessageListener(handler: (line: string) => void): void;
  postMessage(command: string): void;
}

type EvaluatePayload = {
  fen: string;
  depth?: number;
  movetime?: number;
};

type EvaluateJob = EvaluatePayload & {
  id: string;
};

type IncomingMessage =
  | { type: "evaluate"; id: string; payload: EvaluatePayload }
  | { type: "configure"; payload: { skillLevel?: number } };

type EvaluationMessage = {
  type: "evaluation";
  id: string;
  payload: {
    fen: string;
    score: EngineScore | null;
    depth: number;
    bestMove: string | null;
  };
};

type ReadyMessage = { type: "ready" };

type ErrorMessage = { type: "error"; id?: string; message: string };

type Outgoing = EvaluationMessage | ReadyMessage | ErrorMessage;

const ctx = self as DedicatedWorkerGlobalScope;
ctx.onclose = () => {
  engineAdapter?.dispose();
};

let engine: StockfishInstance | null = null;
type EngineAdapter = {
  send: (command: string) => void;
  dispose: () => void;
};

let engineAdapter: EngineAdapter | null = null;
let engineReady = false;
let currentSkillLevel = 6;
let activeJob: EvaluateJob | null = null;
let awaitingReadyOk = false;
let lastScore: EngineScore | null = null;
const jobQueue: EvaluateJob[] = [];

const DEFAULT_DEPTH = 10;

startEngine();

ctx.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  if (message.type === "evaluate") {
    jobQueue.push({ id: message.id, ...message.payload });
    processQueue();
  } else if (message.type === "configure") {
    if (typeof message.payload.skillLevel === "number") {
      currentSkillLevel = message.payload.skillLevel;
      sendCommand(`setoption name Skill Level value ${currentSkillLevel}`);
    }
  }
};

function startEngine() {
  if (typeof SharedArrayBuffer === "undefined") {
    startFallbackEngine();
    return;
  }

  (StockfishFactory as StockfishModule)({
    mainScriptUrlOrBlob: stockfishMainScriptUrl,
    locateFile: (path: string) => {
      if (path.endsWith(".wasm")) return wasmUrl;
      if (path.endsWith(".worker.js")) return pthreadWorkerUrl;
      if (path.endsWith(".js")) return stockfishMainScriptUrl;
      return path;
    },
  })
    .then((instance: StockfishInstance) => {
      engine = instance as StockfishInstance;
      engineAdapter = {
        send: (command: string) => engine?.postMessage(command),
        dispose: () => engine?.terminate?.(),
      };
      engine.addMessageListener(handleEngineMessage);
      sendCommand("uci");
    })
    .catch((error: unknown) => {
      postError(`Failed to start Stockfish: ${String(error)}`);
    });
}

function startFallbackEngine() {
  try {
    const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
    const fallbackUrl = new URL(`${base}/stockfish-lite/worker.js`, import.meta.url).href;
    const nestedWorker = new Worker(fallbackUrl);
    nestedWorker.onmessage = (event: MessageEvent<string>) => {
      if (event.data) {
        handleEngineMessage(String(event.data));
      }
    };
    nestedWorker.onerror = (err) => {
      postError(`Fallback engine error: ${err.message ?? err}`);
    };
    engineAdapter = {
      send: (command: string) => nestedWorker.postMessage(command),
      dispose: () => nestedWorker.terminate(),
    };
    sendCommand("uci");
  } catch (error) {
    postError(`Failed to load fallback engine: ${String(error)}`);
  }
}

function handleEngineMessage(rawLine: string) {
  const line = rawLine.trim();

  if (line === "uciok") {
    sendCommand("setoption name Threads value 1");
    sendCommand(`setoption name Skill Level value ${currentSkillLevel}`);
    sendCommand("isready");
    return;
  }

  if (line === "readyok") {
    if (!engineReady) {
      engineReady = true;
      ctx.postMessage({ type: "ready" });
    }

    if (awaitingReadyOk && activeJob) {
      awaitingReadyOk = false;
      startSearch(activeJob);
    } else if (!activeJob) {
      processQueue();
    }

    return;
  }

  if (line.startsWith("info ")) {
    const score = parseScore(line);
    if (score) {
      lastScore = score;
    }
    return;
  }

  if (line.startsWith("bestmove")) {
    finalizeJob(line);
  }
}

function processQueue() {
  if (!engineReady || activeJob || jobQueue.length === 0) return;

  activeJob = jobQueue.shift()!;
  awaitingReadyOk = true;
  lastScore = null;
  sendCommand("stop");
  sendCommand("isready");
}

function startSearch(job: EvaluateJob) {
  if (!engine) return;
  sendCommand("ucinewgame");
  sendCommand(`position fen ${job.fen}`);
  if (job.movetime) {
    sendCommand(`go movetime ${job.movetime}`);
  } else {
    sendCommand(`go depth ${job.depth ?? DEFAULT_DEPTH}`);
  }
}

function finalizeJob(line: string) {
  if (!activeJob) return;

  const segments = line.trim().split(" ");
  const bestToken = segments[1] ?? null;
  const bestMove = bestToken && bestToken !== "(none)" ? bestToken : null;

  const payload: EvaluationMessage["payload"] = {
    fen: activeJob.fen,
    score: lastScore,
    depth: activeJob.depth ?? DEFAULT_DEPTH,
    bestMove,
  };

  ctx.postMessage({ type: "evaluation", id: activeJob.id, payload });
  activeJob = null;
  awaitingReadyOk = false;
  lastScore = null;
  processQueue();
}

function parseScore(line: string): EngineScore | null {
  const match = line.match(/score\s+(cp|mate)\s+(-?\d+)/);
  if (!match) return null;

  if (match[1] === "cp") {
    return { type: "cp", value: Number(match[2]) };
  }

  return { type: "mate", value: Number(match[2]) };
}

function postError(message: string, id?: string) {
  const errorMessage: ErrorMessage = { type: "error", message, id };
  ctx.postMessage(errorMessage satisfies Outgoing);
}

function sendCommand(command: string) {
  engineAdapter?.send(command);
}

export {};
