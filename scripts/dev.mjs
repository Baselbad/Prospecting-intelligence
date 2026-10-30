import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };

const server = createServer(async (request, response) => {
  if (request.url === "/config.js") {
    response.writeHead(200, { "Content-Type": mime[".js"], "Cache-Control": "no-store" });
    response.end(`window.__IGEHO_CONFIG__ = ${JSON.stringify({ apiUrl: process.env.PROSPECTING_API_URL || "" })};\n`);
    return;
  }
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const target = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!(target === root || target.startsWith(`${root}${sep}`))) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(target);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": mime[extname(target)] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, "0.0.0.0", () => console.log(`igeho Prospecting Intelligence: http://localhost:${port}`));
