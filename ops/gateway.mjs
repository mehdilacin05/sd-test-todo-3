import http from "node:http";

// Only the app, public auth API and user-scoped PostgREST are reachable here.
http
  .createServer((req, res) => {
    const auth = req.url.startsWith("/auth/v1/");
    const rest = req.url.startsWith("/rest/v1/");
    // Service-role/admin APIs are for Studio on its private network, not browsers.
    const publicAuth =
      /^\/auth\/v1\/(?:otp|verify|token|logout|user|settings|callback|\.well-known\/jwks\.json)(?:\?|$)/.test(
        req.url,
      );
    if (process.env.PRIVATE_GATEWAY !== "true" && auth && !publicAuth) {
      res.writeHead(404).end();
      return;
    }
    const upstream = http.request(
      {
        hostname: auth ? "auth" : rest ? "rest" : "app",
        port: auth ? 9999 : rest ? 3000 : 3000,
        path: auth ? req.url.slice(8) : rest ? req.url.slice(8) : req.url,
        method: req.method,
        headers: req.headers,
      },
      (incoming) => {
        res.writeHead(incoming.statusCode, incoming.headers);
        incoming.pipe(res);
      },
    );
    upstream.on("error", () => {
      if (!res.headersSent) res.writeHead(502);
      res.end();
    });
    req.pipe(upstream);
  })
  .listen(3001, "0.0.0.0");
