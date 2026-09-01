# FinePrint

FinePrint is a deliberately deceptive streaming sign-up page that shows how an external WebMCP-aware agent can make consent and purchase-adjacent choices understandable before a user acts. The site deliberately does not diagnose its own dark patterns: the agent discovers the declared consequences, defaults, alternatives, terms, and offer-timer behavior through WebMCP tools, then explains them to the user.

It is a static, local-only hackathon demo. It never collects information, starts a subscription, requests real permissions, or sends data anywhere.

The ten decorative poster backgrounds are local, cropped Unsplash images. Their source manifest is in [`assets/posters/SOURCES.md`](assets/posters/SOURCES.md).

## What to demonstrate

The page contains five realistic traps:

1. Cookie consent with a pre-checked partner-sharing choice and a visually dominant accept button.
2. A bundled Terms checkbox plus a long Terms and Privacy Policy modal with the arbitration clause buried in ordinary legal text.
3. A free trial that converts to $49.99 per month after 14 days.
4. A recommendation prompt that asks for precise location, contacts, and notifications.
5. A founding-price countdown that resets on reload and sells an annual plan.

Each interactable choice has a machine-readable policy declaration embedded in `index.html`. The tools read that declaration at runtime for financial, data-sharing, timing, offer-disclosure, and clause-reference facts. The external agent—not the site—interprets those facts and identifies dark patterns.

## WebMCP tool surface

| Tool | Type | Purpose |
| --- | --- | --- |
| `getChoiceDetails` | Read-only | Returns the decision group, default-selection state, and policy references. |
| `getDecisionImpact` | Read-only | Returns data sharing, financial commitment, renewal, reversibility, and timing. |
| `getAvailableChoices` | Read-only | Lists alternatives in the same decision group and their declared impacts. |
| `getPolicyReferences` | Read-only | Returns the policy sections that govern a choice. |
| `setPrivacyPreference` | State-changing | Applies a privacy-protective demo preference after confirmation. |
| `lockInTimerState` | State-changing | Freezes the demo timer after confirmation and makes the no-deadline state visible. |
| `applySaferDefaults` | State-changing | Applies five visible privacy- and pressure-reducing defaults after confirmation. |

The first four tools have `readOnlyHint: true`. The three state-changing tools open an in-page confirmation sheet before changing the demo state. Read-only calls briefly highlight their related UI, while action tools make their resulting state visibly clear on the page.

## Run locally

Serve this directory from a local HTTP server, then open it in a WebMCP-enabled browser:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The page works normally in browsers without WebMCP; it logs a short fallback message instead of failing.

Run the policy-contract check with:

```sh
python3 -m unittest tests/test_policy_contract.py
```

## Suggested judge prompt

> Before I accept anything on this page, inspect the costs, data sharing, defaults, alternatives, offer disclosures, and policy references. Then explain the risks, apply safer defaults, and freeze the timer if there is no real deadline.

The implementation uses the current imperative `document.modelContext.registerTool()` API as a progressive enhancement. See the [WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) and [tool security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools).
