/* Stockfish lite single-thread fallback wrapper */
self.Module = {
  locateFile: function (path) {
    if (path.endsWith(".wasm")) {
      const base = self.location.href.replace(/worker\.js(?:\?.*)?$/, "");
      return base + "stockfish-17.1-lite-single-03e3232.wasm";
    }
    return path;
  },
};
importScripts("stockfish-17.1-lite-single-03e3232.js");
