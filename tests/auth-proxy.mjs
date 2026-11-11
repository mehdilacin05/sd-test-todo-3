import http from "node:http";

http
  .createServer((request, response) => {
    const auth = request.url.startsWith("/auth/v1/");
    const rest = request.url.startsWith("/rest/v1/");
    if (!auth && !rest) {
      response.writeHead(404).end();
      return;
    }
    const upstream = http.request(
      {
        hostname: auth ? "auth" : "rest",
        port: auth ? 9999 : 3000,
        path: request.url.slice(auth ? "/auth/v1".length : "/rest/v1".length),
        method: request.method,
        headers: { ...request.headers, host: auth ? "auth:9999" : "rest:3000" },
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
