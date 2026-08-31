/**
 * FinePrint — page interactivity
 * -------------------------------------
 * UI behavior plus a progressive WebMCP layer. CONSENT_DATA (data.js) is
 * loaded first and keyed by data-mcp-id, so tool output stays deterministic.
 *
 * WebMCP tools use the current imperative browser API when it is available.
 * The page remains fully usable in browsers that do not expose WebMCP.
 */

document.addEventListener("DOMContentLoaded", () => {

  const getProfile = (elementId) => {
    const profile = CONSENT_DATA[elementId];
    if (!profile) throw new Error(`Unknown FinePrint element: ${elementId}`);
    return profile;
  };

  const policyNode = document.getElementById("fineprint-policy");
  const pagePolicy = JSON.parse(policyNode.textContent);
  const getRuntimeProfile = (elementId) => {
    const editorial = getProfile(elementId);
    const declared = pagePolicy.elements[elementId];
    return {
      ...editorial,
      consequences: declared?.consequences || editorial.consequences,
      clauses: declared?.clauses || []
    };
  };

  const result = (payload) => ({ content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] });

  // ---------- Countdown (Trap #5 — resets on every load, on purpose) ----------
  (function countdown() {
    let seconds = 14 * 60 + 59;
    const el = document.getElementById("countdown");
    setInterval(() => {
      if (seconds <= 0) return;
      seconds -= 1;
      const m = Math.floor(seconds / 60).toString().padStart(2, "0");
      const s = (seconds % 60).toString().padStart(2, "0");
      el.textContent = `${m}:${s}`;
    }, 1000);
  })();

  // ---------- Cookie banner ----------
  const cookieBanner = document.getElementById("cookie-banner");
  ["cookie-accept", "cookie-reject", "cookie-manage"].forEach((id) => {
    document.getElementById(id).addEventListener("click", () => {
      cookieBanner.style.display = "none";
    });
  });

  // ---------- Permissions modal (Trap #4) ----------
  const modal = document.getElementById("permissions-modal");
  document.getElementById("personalize-btn").addEventListener("click", () => {
    modal.hidden = false;
  });
  document.getElementById("permissions-decline").addEventListener("click", () => {
    modal.hidden = true;
  });
  document.getElementById("permissions-allow").addEventListener("click", () => {
    modal.hidden = true;
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.hidden = true;
  });

  // ---------- Safe-action confirmation ----------
  const safeActionModal = document.getElementById("safe-action-modal");
  const safeActionCopy = document.getElementById("safe-action-copy");
  let pendingSafeAction = null;
  const requestSafeAction = (profile) => new Promise((resolve) => {
    pendingSafeAction = resolve;
    safeActionCopy.textContent = `${profile.saferChoice.why} This only changes the simulated demo page.`;
    safeActionModal.hidden = false;
  });
  document.getElementById("safe-action-cancel").addEventListener("click", () => {
    safeActionModal.hidden = true;
    pendingSafeAction?.(false);
    pendingSafeAction = null;
  });
  document.getElementById("safe-action-confirm").addEventListener("click", () => {
    safeActionModal.hidden = true;
    pendingSafeAction?.(true);
    pendingSafeAction = null;
  });

  // ---------- Terms link (Trap #2) ----------
  const termsModal = document.getElementById("terms-modal");
  document.getElementById("terms-link").addEventListener("click", (e) => {
    e.preventDefault();
    termsModal.hidden = false;
  });
  ["terms-close", "terms-close-bottom"].forEach((id) => document.getElementById(id).addEventListener("click", () => { termsModal.hidden = true; }));
  termsModal.addEventListener("click", (e) => { if (e.target === termsModal) termsModal.hidden = true; });

  // ---------- Trial button (Trap #3) ----------
  document.getElementById("trial-btn").addEventListener("click", (e) => {
    e.preventDefault();
    alert("Trial started — billing begins automatically in 14 days unless cancelled.");
  });

  // ---------- Upgrade CTA (Trap #5) ----------
  document.getElementById("upgrade-cta").addEventListener("click", (e) => {
    e.preventDefault();
    alert("Annual plan claimed — $59.88 billed now.");
  });

  // ---------- Utility: visual highlight hook for future WebMCP tools ----------
  window.highlightElement = function (mcpId) {
    const el = document.querySelector(`[data-mcp-id="${mcpId}"]`);
    if (!el) return;
    el.classList.add("mcp-highlight");
    setTimeout(() => el.classList.remove("mcp-highlight"), 2000);
  };

  // ---------- WebMCP: discoverable, data-driven consent tools ----------
  // Register immediately after page setup so agents can discover the complete tool set.
  async function registerWebMCPTools() {
    if (!document.modelContext?.registerTool) {
      console.info("FinePrint: WebMCP is unavailable in this browser.");
      return;
    }

    const elementIdSchema = {
      type: "string",
      enum: Object.keys(CONSENT_DATA),
      description: "The data-mcp-id of the FinePrint choice to inspect."
    };
    const inspect = (elementId) => {
      window.highlightElement(elementId);
      return getRuntimeProfile(elementId);
    };
    const tools = [
      {
        name: "explainAction",
        title: "Explain a choice plainly",
        description: "Explain what a FinePrint choice actually does in plain language. Use before a user accepts cookies, terms, a trial, permissions, or an upgrade.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); return result({ elementId, label: p.label, explanation: p.summary, policyReferences: p.clauses }); }
      },
      {
        name: "getConsequences",
        title: "Get decision consequences",
        description: "Return the structured privacy, money, recurring-charge, reversibility, and timing consequences of one FinePrint choice.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); return result({ elementId, consequences: p.consequences, policyReferences: p.clauses, source: "page-declared policy" }); }
      },
      {
        name: "detectDarkPatterns",
        title: "Detect dark patterns",
        description: "Identify dark-pattern techniques associated with a FinePrint choice, including pre-checked consent, hidden opt-outs, false urgency, visual asymmetry, and buried clauses.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); return result({ elementId, flags: p.darkPatterns.map((flag) => ({ flag, meaning: DARK_PATTERN_DEFINITIONS[flag] })) }); }
      },
      {
        name: "getAccessibleSummary",
        title: "Get accessible choice summary",
        description: "Explain a FinePrint choice in standard, elderly-friendly, or low-vision-friendly wording. The facts remain the same; only the phrasing changes.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema, mode: { type: "string", enum: ["standard", "elderly", "lowVision"], description: "Accessibility phrasing to use." } }, required: ["elementId", "mode"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId, mode }) => { const p = inspect(elementId); return result({ elementId, mode, summary: ACCESSIBLE_SUMMARY_STYLES[mode](p) }); }
      },
      {
        name: "compareChoices",
        title: "Compare a choice with its safer alternative",
        description: "Compare the selected FinePrint choice against the lower-risk option on the page, including data sharing, costs, and reversibility.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); const safer = p.saferChoice && getRuntimeProfile(p.saferChoice.mcpId); return result({ selected: { label: p.label, consequences: p.consequences, policyReferences: p.clauses }, saferAlternative: safer ? { label: p.saferChoice.label, why: p.saferChoice.why, consequences: safer.consequences, policyReferences: safer.clauses } : null }); }
      },
      {
        name: "performSafeAction",
        title: "Choose the safer on-page option",
        description: "Perform the lower-risk FinePrint action in the page UI, such as rejecting cookies, declining permissions, or turning off partner sharing. This changes page state but never makes a purchase or shares data.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        execute: async ({ elementId }) => {
          const p = inspect(elementId);
          const targetId = p.saferChoice?.mcpId;
          if (!targetId) return result({ changed: false, message: "This choice has no on-page safer alternative to perform." });
          const confirmed = await requestSafeAction(p);
          if (!confirmed) return result({ changed: false, message: "The user kept the current simulated choice." });
          if (targetId === "cookie-reject") document.getElementById("cookie-reject").click();
          if (targetId === "permissions-decline") document.getElementById("permissions-decline").click();
          window.highlightElement(targetId);
          return result({ changed: true, selected: targetId, message: `Selected safer option: ${p.saferChoice.label}.`, policyReferences: getRuntimeProfile(targetId).clauses });
        }
      }
    ];
    await Promise.all(tools.map((tool) => document.modelContext.registerTool(tool)));
    console.info(`FinePrint: registered ${tools.length} WebMCP tools.`);
  }

  registerWebMCPTools().catch((error) => console.warn("FinePrint: WebMCP registration failed.", error));
});
