# FinePrint

FinePrint is a WebMCP consent layer on a deliberately deceptive streaming sign-up page (Nimbus). It shows how a website can publish **machine-readable facts** about terms, privacy, money, and defaults so a user's agent can explain them *before* anyone blindly accepts.

The site does not diagnose its own dark patterns. The agent discovers declared consequences, alternatives, and legal clauses through WebMCP tools, explains them in plain language, and — only after the human confirms — applies safer demo defaults.

This is a static hackathon demo. It never collects information, starts a subscription, requests real permissions, or sends data anywhere.

The ten decorative poster backgrounds are local, cropped Unsplash images. Their source manifest is in [`assets/posters/SOURCES.md`](assets/posters/SOURCES.md).

## What to demonstrate

The page contains five realistic traps:

1. Cookie consent with a pre-checked partner-sharing choice and a visually dominant accept button.
2. A bundled Terms checkbox plus a long Terms and Privacy Policy modal with the arbitration clause buried in ordinary legal text.
3. A free trial that converts to $49.99 per month after 14 days.
4. A recommendation prompt that asks for precise location, contacts, and notifications.
5. A founding-price countdown that resets on reload and sells an annual plan.

Each interactable choice has a machine-readable policy declaration embedded in `index.html`. Clause text lives in the legal document with stable `data-clause-id` attributes. Tools read those sources at runtime. The external agent — not the site — interprets the facts.

The FinePrint dock on the page states that Nimbus is a demo, copies a judge prompt, logs agent tool activity, and resets the demo.

## WebMCP tool surface

| Tool | Type | Purpose |
| --- | --- | --- |
| `listConsentDecisions` | Read-only | Lists every decision group, choice id, label, and default-selected flag. Start here. |
| `getChoiceDetails` | Read-only | Returns the decision group, default-selection state, and policy references. |
| `getDecisionImpact` | Read-only | Returns data sharing, financial commitment, renewal, reversibility, and timing. |
| `getAvailableChoices` | Read-only | Lists alternatives in the same decision group and their declared impacts. |
| `getPolicyReferences` | Read-only | Returns clause ids and on-page labels that govern a choice. |
| `getPolicySection` | Read-only | Returns the full text of a terms, cookie, or permission section. |
| `showPolicySection` | Read-only | Opens the legal document, scrolls to the clause, and highlights it. |
| `setPrivacyPreference` | State-changing | Applies a privacy-protective demo preference after confirmation. |
| `lockInTimerState` | State-changing | Freezes the demo timer after confirmation and makes the no-deadline state visible. |
| `applySaferDefaults` | State-changing | Applies five visible privacy- and pressure-reducing defaults after confirmation. |
| `resetDemo` | State-changing | Restores cookie, terms, trial, timer, and receipt state for another run. |

Read-only tools have `readOnlyHint: true` and highlight related UI. State-changing tools (except `resetDemo`) open an in-page confirmation sheet. After a confirmed action, the page keeps the safer state visible and logs the call in the FinePrint dock.

Dark-pattern vocabulary for agents and the demo video lives in [`data.js`](data.js) as editorial notes. That file is **not** loaded by the page and is **not** exposed as a tool.

## Run locally

Serve this directory from a local HTTP server, then open it in a WebMCP-enabled browser:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The page works normally in browsers without WebMCP; the dock reports that agent tools are unavailable.

To test in Google Chrome, enable `chrome://flags/#enable-webmcp-testing`. Judges can also open the deployed URL in ChatGPT’s in-app browser.

Run the policy-contract check with:

```sh
python3 -m unittest tests/test_policy_contract.py
```

## Suggested judge prompt

> Before I accept anything, list the consent decisions on this page. Inspect costs, data sharing, defaults, alternatives, and the terms that govern them — especially the trial and arbitration clauses. Explain the risks in plain language, then apply safer defaults after I confirm.

## Submission notes

Devpost copy, a 90-second demo script, and deploy notes are in [`SUBMISSION.md`](SUBMISSION.md). This project is licensed under the MIT License.

The implementation uses the current imperative `document.modelContext.registerTool()` API as a progressive enhancement. See the [WebMCP imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) and [tool security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools).
