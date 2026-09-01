/**
 * FinePrint — page interactivity
 * -------------------------------------
 * UI behavior plus a progressive WebMCP layer. Tool output comes exclusively
 * from the page's machine-readable policy declaration.
 *
 * WebMCP tools use the current imperative browser API when it is available.
 * The page remains fully usable in browsers that do not expose WebMCP.
 */

document.addEventListener("DOMContentLoaded", () => {

  const policyNode = document.getElementById("fineprint-policy");
  const pagePolicy = JSON.parse(policyNode.textContent);
  const getRuntimeProfile = (elementId) => {
    const declared = pagePolicy.elements[elementId];
    if (!declared) throw new Error(`Unknown FinePrint element: ${elementId}`);
    return declared;
  };

  const result = (payload) => ({ content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] });

  // ---------- Countdown (Trap #5 — resets on every load, on purpose) ----------
  let countdownTimer;
  let timerLocked = false;
  (function countdown() {
    let seconds = 14 * 60 + 59;
    const el = document.getElementById("countdown");
    countdownTimer = setInterval(() => {
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
    safeActionCopy.textContent = `FinePrint will apply “${profile.label}” to this demo page. This does not purchase anything, transmit data, or grant a real permission.`;
    safeActionModal.hidden = false;
  });
  const applySafeAction = async (elementId, callback) => {
    const confirmed = await requestSafeAction(getRuntimeProfile(elementId));
    if (!confirmed) return false;
    callback();
    return true;
  };
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

  // ---------- Declarative WebMCP trial form ----------
  document.getElementById("trial-form").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Trial started — billing begins automatically in 14 days unless cancelled.");
  });

  // ---------- Upgrade CTA (Trap #5) ----------
  document.getElementById("upgrade-cta").addEventListener("click", (e) => {
    e.preventDefault();
    alert("Annual plan claimed — $59.88 billed now.");
  });

  // ---------- Utility: visual highlight hook for WebMCP tool calls ----------
  window.highlightElement = function (mcpId) {
    const el = document.querySelector(`[data-mcp-id="${mcpId}"]`);
    if (!el) return;
    el.classList.add("mcp-highlight");
    setTimeout(() => el.classList.remove("mcp-highlight"), 2000);
  };

  const showAgentOutcome = (message) => {
    const outcome = document.getElementById("agent-outcome");
    outcome.textContent = `Agent update: ${message}`;
    outcome.hidden = false;
    setTimeout(() => { outcome.hidden = true; }, 4500);
  };
  const applyEssentialCookies = () => {
    const checkbox = document.getElementById("cookie-partners");
    checkbox.checked = false;
    checkbox.disabled = true;
    cookieBanner.classList.add("agent-resolved");
    document.getElementById("cookie-agent-state").hidden = false;
    window.highlightElement("cookie-partners-row");
  };
  const lockTimerState = () => {
    if (timerLocked) return;
    timerLocked = true;
    clearInterval(countdownTimer);
    document.getElementById("upgrade-banner").classList.add("is-locked");
    document.getElementById("countdown").textContent = "NO DEADLINE";
    document.getElementById("upgrade-cta").textContent = "Price held";
    window.highlightElement("upgrade-cta");
  };
  const applySaferDefaults = () => {
    applyEssentialCookies();
    document.querySelector("#terms-row input").checked = false;
    document.getElementById("terms-row").classList.add("agent-resolved");
    document.querySelector(".signup-card").classList.add("agent-resolved");
    document.getElementById("trial-btn").textContent = "Review $49.99/month before starting";
    document.querySelector(".personalize-strip").classList.add("agent-resolved");
    document.getElementById("personalize-btn").textContent = "Watch-history recommendations on";
    lockTimerState();
    ["terms-row", "trial-btn", "personalize-btn"].forEach(window.highlightElement);
  };

  // ---------- WebMCP: discoverable, data-driven consent tools ----------
  // Register immediately after page setup so agents can discover the complete tool set.
  async function registerWebMCPTools() {
    if (!document.modelContext?.registerTool) {
      document.getElementById("agent-status-copy").textContent = "Agent tools unavailable in this browser";
      console.info("FinePrint: WebMCP is unavailable in this browser.");
      return;
    }

    const elementIdSchema = {
      type: "string",
      enum: Object.keys(pagePolicy.elements),
      description: "The data-mcp-id of a choice declared in this page's policy."
    };
    const inspect = (elementId) => {
      window.highlightElement(elementId);
      return getRuntimeProfile(elementId);
    };
    const availableChoices = (elementId) => {
      window.highlightElement(elementId);
      const decision = pagePolicy.elements[elementId]?.decision;
      return Object.entries(pagePolicy.elements)
        .filter(([, details]) => details.decision === decision)
        .map(([choiceId, details]) => ({ choiceId, label: details.label, consequences: details.consequences, disclosures: details.disclosures || {}, defaultSelected: details.defaultSelected }));
    };
    const tools = [
      {
        name: "getChoiceDetails",
        title: "Get choice details",
        description: "Return the site's declared decision group, default selection state, and policy references for a visible choice.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); return result({ elementId, label: p.label, decision: p.decision, defaultSelected: p.defaultSelected, policyReferences: p.clauses }); }
      },
      {
        name: "getDecisionImpact",
        title: "Get decision impact",
        description: "Return the site's declared data sharing, financial commitment, renewal, reversibility, and timing for one choice.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); return result({ elementId, consequences: p.consequences, disclosures: p.disclosures || {}, policyReferences: p.clauses, source: "page-declared policy" }); }
      },
      {
        name: "getAvailableChoices",
        title: "Get available choices",
        description: "List the declared choices in the same decision group, including each choice's impact and whether it is selected by default.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => result({ elementId, choices: availableChoices(elementId), source: "page-declared policy" })
      },
      {
        name: "getPolicyReferences",
        title: "Get policy references",
        description: "Return the page policy sections that govern a choice, so an agent can present or inspect the relevant terms.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); return result({ elementId, policyReferences: p.clauses }); }
      },
      {
        name: "setPrivacyPreference",
        title: "Set privacy preference",
        description: "Set an available privacy-protective preference in the demo page after a visible confirmation. It never purchases, transmits data, or grants a real permission.",
        inputSchema: { type: "object", properties: { preference: { type: "string", enum: ["essential-cookies", "decline-recommendation-permissions"], description: "Privacy preference to apply." } }, required: ["preference"] },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        execute: async ({ preference }) => {
          const targetId = preference === "essential-cookies" ? "cookie-reject" : "permissions-decline";
          const p = getRuntimeProfile(targetId);
          window.highlightElement(targetId);
          const confirmed = await applySafeAction(targetId, () => {
            if (targetId === "cookie-reject") applyEssentialCookies();
            if (targetId === "permissions-decline") document.getElementById("permissions-decline").click();
          });
          if (!confirmed) return result({ changed: false, message: "The user kept the current simulated choice." });
          window.highlightElement(targetId);
          showAgentOutcome(preference === "essential-cookies" ? "essential cookies selected; partner sharing is off." : "location, contacts, and notifications were declined.");
          return result({ changed: true, selected: targetId, preference, policyReferences: p.clauses });
        }
      },
      {
        name: "lockInTimerState",
        title: "Lock in the timer state",
        description: "Freeze the demo offer timer after visible confirmation, making the no-deadline offer state explicit. This does not buy or reserve a plan.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        execute: async () => {
          const confirmed = await requestSafeAction({ label: "Lock in the offer timer state" });
          if (!confirmed) return result({ changed: false, message: "The user kept the running demo timer." });
          lockTimerState();
          showAgentOutcome("the offer timer is frozen; no deadline applies.");
          return result({ changed: true, timerLocked: true, offerHasRealDeadline: false });
        }
      },
      {
        name: "applySaferDefaults",
        title: "Apply safer defaults",
        description: "Apply the available privacy-protective and no-pressure defaults across the demo after visible confirmation. This never starts a trial, buys a plan, or transmits data.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        execute: async () => {
          const confirmed = await requestSafeAction({ label: "Apply safer defaults across this demo" });
          if (!confirmed) return result({ changed: false, message: "The user kept the current demo defaults." });
          applySaferDefaults();
          showAgentOutcome("five safer defaults are now visible on the page.");
          return result({ changed: true, changes: ["partner sharing off", "marketing consent unchecked", "trial renewal surfaced", "unnecessary permissions avoided", "timer frozen"] });
        }
      }
    ];
    await Promise.all(tools.map((tool) => document.modelContext.registerTool(tool)));
    document.getElementById("agent-status").classList.add("is-ready");
    document.getElementById("agent-status-copy").textContent = "Agent tools ready";
    console.info(`FinePrint: registered ${tools.length} WebMCP tools.`);
  }

  registerWebMCPTools().catch((error) => console.warn("FinePrint: WebMCP registration failed.", error));
});
