import http from "node:http";

http
  .createServer((request, response) => {
    if (!request.url.startsWith("/auth/v1/")) {
      response.writeHead(404).end();
      return;
    }
    const upstream = http.request(
      {
        hostname: "auth",
        port: 9999,
        path: request.url.slice("/auth/v1".length),
        method: request.method,
        headers: { ...request.headers, host: "auth:9999" },
      },
      (incoming) => {
        response.writeHead(incoming.statusCode, incoming.headers);
        incoming.pipe(response);
      },
    );
    upstream.on("error", () => response.writeHead(502).end());
    request.pipe(upstream);
  })
  .listen(3001, "0.0.0.0");
