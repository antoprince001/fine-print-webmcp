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

  // ---------- FinePrint: visible review and safe-choice receipt ----------
  const reviewItems = [
    { id: "cookie-partners-row", title: "Tracking is already on", detail: "Your activity is pre-selected for ad partners." },
    { id: "terms-row", title: "Terms bundle marketing", detail: "One checkbox also opts you into partner offers." },
    { id: "trial-btn", title: "Free becomes $49.99/month", detail: "Auto-renews after 14 days unless cancelled." },
    { id: "personalize-btn", title: "Recommendations over-ask", detail: "The prompt requests location, contacts, and alerts." },
    { id: "upgrade-cta", title: "The timer is artificial", detail: "The annual-plan countdown resets on reload." }
  ];
  const risks = document.getElementById("fineprint-risks");
  const receipt = document.getElementById("fineprint-receipt");
  const reviewPanel = document.querySelector(".fineprint-panel");
  const reviewTitle = document.getElementById("fineprint-title");
  const reviewIntro = document.querySelector(".fineprint-panel__intro");
  const showReceipt = (message) => {
    receipt.textContent = `✓ ${message}`;
    receipt.hidden = false;
  };
  const focusReviewItem = (id) => {
    const target = document.querySelector(`[data-mcp-id="${id}"]`) || document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.highlightElement(id);
  };
  reviewItems.forEach(({ id, title, detail }, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "fineprint-risk";
    item.innerHTML = `<span class="fineprint-risk__number">${index + 1}</span><span><strong>${title}</strong><span>${detail}</span></span><span class="fineprint-risk__arrow" aria-hidden="true">›</span>`;
    item.addEventListener("click", () => focusReviewItem(id));
    risks.appendChild(item);
  });
  const revealFinePrint = (elementId) => {
    const profile = getProfile(elementId);
    reviewPanel.hidden = false;
    reviewTitle.textContent = `Reviewing: ${profile.label}`;
    reviewIntro.textContent = profile.summary;
    risks.querySelectorAll(".fineprint-risk").forEach((item, index) => {
      item.classList.toggle("is-active", reviewItems[index].id === elementId);
    });
  };
  document.getElementById("fineprint-essential").addEventListener("click", async () => {
    const changed = await applySafeAction("cookie-reject", () => document.getElementById("cookie-reject").click());
    if (changed) showReceipt("Essential cookies selected. Advertising-partner sharing is off.");
  });
  document.getElementById("fineprint-review-all").addEventListener("click", () => focusReviewItem("upgrade-cta"));

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

  // ---------- Utility: visual highlight hook for WebMCP tool calls ----------
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
      enum: Object.keys(pagePolicy.elements),
      description: "The data-mcp-id of a choice declared in this page's policy."
    };
    const inspect = (elementId) => {
      revealFinePrint(elementId);
      window.highlightElement(elementId);
      return getRuntimeProfile(elementId);
    };
    const availableChoices = (elementId) => {
      revealFinePrint(elementId);
      const decision = pagePolicy.elements[elementId]?.decision;
      return Object.entries(pagePolicy.elements)
        .filter(([, details]) => details.decision === decision)
        .map(([choiceId, details]) => ({ choiceId, consequences: details.consequences, defaultSelected: details.defaultSelected }));
    };
    const tools = [
      {
        name: "getChoiceDetails",
        title: "Get choice details",
        description: "Return the site's declared decision group, default selection state, and policy references for a visible choice.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); const declared = pagePolicy.elements[elementId] || {}; return result({ elementId, label: p.label, decision: declared.decision, defaultSelected: declared.defaultSelected || false, policyReferences: p.clauses }); }
      },
      {
        name: "getDecisionImpact",
        title: "Get decision impact",
        description: "Return the site's declared data sharing, financial commitment, renewal, reversibility, and timing for one choice.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => { const p = inspect(elementId); return result({ elementId, consequences: p.consequences, policyReferences: p.clauses, source: "page-declared policy" }); }
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
          revealFinePrint(targetId);
          const p = getRuntimeProfile(targetId);
          window.highlightElement(targetId);
          const confirmed = await applySafeAction(targetId, () => {
            if (targetId === "cookie-reject") document.getElementById("cookie-reject").click();
            if (targetId === "permissions-decline") document.getElementById("permissions-decline").click();
          });
          if (!confirmed) return result({ changed: false, message: "The user kept the current simulated choice." });
          window.highlightElement(targetId);
          return result({ changed: true, selected: targetId, preference, policyReferences: p.clauses });
        }
      }
    ];
    await Promise.all(tools.map((tool) => document.modelContext.registerTool(tool)));
    console.info(`FinePrint: registered ${tools.length} WebMCP tools.`);
  }

  registerWebMCPTools().catch((error) => console.warn("FinePrint: WebMCP registration failed.", error));
});
