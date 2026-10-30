# Secure same-origin API proxy

The browser must call a public path on the same origin as the interface, for example `POST /api/prospecting`. That server-side route adds upstream authentication and forwards the request to the prospecting agent API. A bearer token must never enter `config.js`, browser JavaScript, HTML, logs, error messages, fixtures, CSV exports, or browser storage.

## Environment separation

Configure these values in the deployment platform, not in committed files:

- `PROSPECTING_API_URL=/api/prospecting`: public browser configuration. This is a relative path, not a secret.
- `PROSPECTING_AGENT_API_URL`: server-only upstream HTTPS endpoint.
- `PROSPECTING_AGENT_API_TOKEN`: server-only token stored in the platform's secret manager.
- `PROSPECTING_APP_ORIGIN`: server-only canonical public origin, for example `https://prospecting.example.org`.

Do not prefix server-only variables with frontend-exposing conventions such as `PUBLIC_`, `VITE_`, or `NEXT_PUBLIC_`. Rotate the token if it is ever returned to a client, written to a log, or committed.

## Node handler pattern

Adapt this pattern to the approved hosting framework. The handler validates the request before forwarding it, applies a short timeout, sends authentication only to the allowlisted upstream, and returns a generic error to the browser.

```js
const allowedKeys = new Set(["query", "filters"]);

export async function postProspecting(request, response) {
  const expectedOrigin = new URL(process.env.PROSPECTING_APP_ORIGIN).origin;
  if (request.headers.origin && request.headers.origin !== expectedOrigin) {
    return response.status(403).json({ error: "Origin not allowed" });
  }

  const body = request.body;
  const valid = body && typeof body === "object"
    && Object.keys(body).every(key => allowedKeys.has(key))
    && typeof body.query === "string"
    && body.query.trim().length > 0
    && body.query.length <= 200
    && (!body.filters || typeof body.filters === "object");
  if (!valid) return response.status(400).json({ error: "Invalid request" });

  const upstream = new URL(process.env.PROSPECTING_AGENT_API_URL);
  if (upstream.protocol !== "https:") {
    return response.status(503).json({ error: "Service is not configured" });
  }

  try {
    const upstreamResponse = await fetch(upstream, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PROSPECTING_AGENT_API_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ query: body.query.trim(), filters: body.filters || {} }),
      signal: AbortSignal.timeout(30_000)
    });

    if (!upstreamResponse.ok) {
      // Log only a request ID, upstream status, and allowlisted operational fields.
      return response.status(502).json({ error: "Prospecting service unavailable" });
    }
    const result = await upstreamResponse.json();
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json(result);
  } catch {
    return response.status(502).json({ error: "Prospecting service unavailable" });
  }
}
```

Production code should also cap the request body, validate the response schema, rate-limit abusive callers, attach a non-sensitive request ID, and use the platform's outbound allowlist where available. Do not reflect upstream response bodies or authorization errors to the browser.

## CORS and cookies

A same-origin relative path needs no permissive CORS headers. Keep `Access-Control-Allow-Origin` absent unless the deployment genuinely spans approved origins. If cross-origin access is unavoidable, return one explicit allowlisted origin, add `Vary: Origin`, restrict methods to `POST` and `OPTIONS`, and restrict headers to `Content-Type`. Never combine `Access-Control-Allow-Origin: *` with credentials.

The proxy pattern above uses an upstream bearer token and does not require a browser cookie. If a deployment adds cookie-based user authentication, use `Secure`, `HttpOnly`, and an appropriate `SameSite` policy, and add CSRF protection in addition to the Origin check.

## Deployment verification

Before describing a release as live, verify that the public interface calls the relative proxy path, the deployed revision matches the reviewed commit, no token appears in browser network responses or built assets, rejected origins fail, malformed bodies fail, upstream failures are redacted, and the production secret exists only in server-side configuration.
