# FinePrint — Session Handoff

## Project goal

FinePrint is a hackathon demo for WebMCP: a deliberately deceptive streaming sign-up page that lets a browser agent inspect a site's declared consent, privacy, subscription, and policy facts before the user acts.

The key product framing is now:

- The **website** publishes neutral, machine-readable facts through WebMCP.
- The **FinePrint agent** interprets those facts, identifies dark patterns, adapts explanations for accessibility, and recommends a safer option.

This avoids an implausible website tool such as `detectDarkPatterns`, where a deceptive site self-reports its own manipulation.

## Current implementation

### Five deliberately deceptive UI scenarios

1. Cookie banner: advertising-partner sharing is pre-checked; Accept all is visually dominant.
2. Terms checkbox: consent is pre-checked and bundles partner offers; a long policy modal contains arbitration and data-sharing clauses.
3. Free trial: converts to `$49.99/month` after 14 days.
4. Recommendation permissions: asks for location, contacts, and notifications.
5. Founding-price offer: countdown resets after a reload; purchase is annual billing.

### Website-owned policy data

`index.html` includes `<script id="fineprint-policy" type="application/json">`.

It declares per-choice:

- `decision` — the group to which the choice belongs
- `defaultSelected`
- `consequences` — `dataShared`, `moneyCommitted`, `recurringCharge`, `reversible`, `timeLimit`
- `clauses` — relevant terms/policy references

`script.js` reads this declaration at runtime. The existing `data.js` profiles are now the FinePrint editorial-analysis layer (plain language, dark-pattern rules, accessible phrasings), not part of the site’s public WebMCP contract.

### Registered WebMCP tools

The WebMCP tools use `document.modelContext.registerTool()`:

| Tool | Purpose | State |
| --- | --- | --- |
| `getChoiceDetails({elementId})` | Returns decision group, default-selection state, and policy references. | Read-only |
| `getDecisionImpact({elementId})` | Returns declared data, monetary, renewal, reversibility, and time effects. | Read-only |
| `getAvailableChoices({elementId})` | Returns choices in the same decision group with declared impacts and defaults. | Read-only |
| `getPolicyReferences({elementId})` | Returns policy clause identifiers for a choice. | Read-only |
| `setPrivacyPreference({preference})` | Applies a demo-only privacy preference after an on-page confirmation. | State-changing |

The state-changing preference enum is intentionally constrained to:

- `essential-cookies`
- `decline-recommendation-permissions`

It never makes a purchase, sends information, or grants a real browser permission.

## Visual assets

Ten local, 700×1050 poster images are stored in `assets/posters/` and used by the Trending and Originals tiles.

- Source manifest: `assets/posters/SOURCES.md`
- License: Unsplash License; use is documented, images are conservative landscape/nature imagery without recognizable people, brands, or artwork.
- Tile wiring and title overlay: `style.css`

## Important files

- `index.html` — markup, five traps, legal/confirmation modals, embedded policy JSON.
- `style.css` — complete visual design and local poster references.
- `data.js` — FinePrint-only analysis and accessibility source data.
- `script.js` — page interactions and WebMCP registrations.
- `README.md` — setup, tool table, demo prompt, design notes.
- `tests/test_policy_contract.py` — policy schema, five-trap coverage, local asset references, neutral-tool regression test.

## Verification performed

Run:

```sh
python3 -m unittest tests/test_policy_contract.py
```

Current result: **4 tests pass**.

Earlier in this session, the page was loaded in a WebMCP-enabled browser. Its registered tools were discovered successfully and read-only calls returned the expected structured results. The browser preview server may need to be started in a normal persistent terminal session, e.g.:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Then navigate to `http://127.0.0.1:4173/` in a WebMCP-capable browser.

## Recommended next work

1. Build the actual FinePrint **agent-side analysis**:
   - Feed it the neutral WebMCP tool responses.
   - Implement deterministic rules such as `defaultSelected + marketing data recipient => preCheckedBox` and a known resettable timer => `falseUrgency`.
   - Have the agent produce accessible summaries from the returned facts.

2. Make policy references actionable:
   - Map `Terms §2`, `§4`, `§5`, and `§6` to IDs in the legal modal.
   - Let the agent or a page tool scroll to and highlight a referenced clause.

3. Add a demo reset flow:
   - Restore cookie banner, modal state, checkboxes, and countdown for repeated judge runs.

4. Deploy to a public HTTPS host before the hackathon submission and test WebMCP discovery there.

5. Prepare a 90-second demo:
   - “Is the free trial really free?”
   - Agent calls `getDecisionImpact(trial-btn)` and `getPolicyReferences(trial-btn)`.
   - “What happens if I accept cookies?”
   - Agent calls `getChoiceDetails(cookie-partners-row)` and `getAvailableChoices(cookie-accept)`.
   - Agent identifies the pre-check and partner-sharing consequence, then calls `setPrivacyPreference(essential-cookies)` after confirmation.

## WebMCP design decision

Stay tool-focused for now. Current WebMCP documentation centres the stable browser API on registered tools; resources are still being proposed/discussed. The embedded JSON policy declaration plus neutral tools is the compatible approach for this demo.
