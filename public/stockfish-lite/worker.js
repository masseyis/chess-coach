/* Stockfish lite single-thread fallback wrapper */
self.Module = {
  locateFile: function (path) {
    if (path.endsWith(".wasm")) {
      const base = self.location.href.replace(/worker\.js(?:\?.*)?$/, "");
      return base + "stockfish.wasm";
    }
    return path;
  },
};
importScripts("stockfish.js");
