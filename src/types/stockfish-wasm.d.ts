declare module "stockfish.wasm" {
  export type StockfishOptions = {
    locateFile?: (path: string) => string;
    mainScriptUrlOrBlob?: string;
  };

  export type StockfishModule = {
    mainScriptUrlOrBlob?: string;
  } & ((options?: StockfishOptions) => Promise<{
    addMessageListener(handler: (line: string) => void): void;
    removeMessageListener(handler: (line: string) => void): void;
    postMessage(command: string): void;
  }>);

  const StockfishFactory: StockfishModule;
  export default StockfishFactory;
}
