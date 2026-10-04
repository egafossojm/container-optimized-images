const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "content-type": "text/plain; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  res.end("ok\n");
});

server.headersTimeout = 10_000;
server.requestTimeout = 30_000;

// This process is process 1 inside the container. Linux does not stop
// process 1 on SIGTERM unless the program handles it. Exit so `docker stop` finishes.
function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(8080, "0.0.0.0");
