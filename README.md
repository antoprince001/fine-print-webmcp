# FinePrint

FinePrint is a deliberately deceptive streaming sign-up page that shows how a WebMCP-aware agent can make consent and purchase-adjacent choices understandable before a user acts.

It is a static, local-only hackathon demo. It never collects information, starts a subscription, requests real permissions, or sends data anywhere.

## What to demonstrate

The page contains five realistic traps:

1. Cookie consent with a pre-checked partner-sharing choice and a visually dominant accept button.
2. A bundled Terms checkbox plus a long Terms and Privacy Policy modal with the arbitration clause buried in ordinary legal text.
3. A free trial that converts to $49.99 per month after 14 days.
4. A recommendation prompt that asks for precise location, contacts, and notifications.
5. A founding-price countdown that resets on reload and sells an annual plan.

Each interactable choice is backed by a hand-authored risk profile in `data.js`. This keeps the tool results consistent, reviewable, and separate from the presentation layer.

## WebMCP tool surface

| Tool | Type | Purpose |
| --- | --- | --- |
| `explainAction` | Read-only | Explains the actual outcome in plain language. |
| `getConsequences` | Read-only | Returns data sharing, financial commitment, renewal, reversibility, and timing. |
| `detectDarkPatterns` | Read-only | Returns named dark-pattern flags and definitions. |
| `getAccessibleSummary` | Read-only | Adapts the same facts for standard, elderly-friendly, or low-vision-friendly wording. |
| `compareChoices` | Read-only | Compares the selected choice to the safer alternative where one exists. |
| `performSafeAction` | State-changing | Makes the lower-risk on-page choice; it never purchases, transmits data, or grants a real permission. |

The first five tools have `readOnlyHint: true`. `performSafeAction` is deliberately not read-only, so an agent can keep the user in the loop before changing the page state.

## Run locally

Serve this directory from a local HTTP server, then open it in a WebMCP-enabled browser:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The page works normally in browsers without WebMCP; it logs a short fallback message instead of failing.

## Suggested judge prompt

> Before I accept anything on this page, explain the costs, data sharing, and dark patterns. Then choose the safer option for the cookies.

The implementation uses the current imperative `document.modelContext.registerTool()` API as a progressive enhancement. See the [WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) and [tool security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools).
