/**
 * FinePrint — page interactivity
 * -------------------------------------
 * UI behavior plus a progressive WebMCP layer. Tool output comes exclusively
 * from the page's machine-readable policy declaration and on-page clause text.
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

  const clauseNodes = [...document.querySelectorAll("[data-clause-id]")];
  const clauseIds = clauseNodes.map((node) => node.dataset.clauseId);
  const getClauseNode = (clauseId) => document.querySelector(`[data-clause-id="${clauseId}"]`);
  const readClause = (clauseId) => {
    const node = getClauseNode(clauseId);
    if (!node) throw new Error(`Unknown FinePrint clause: ${clauseId}`);
    const heading = node.querySelector("h4")?.textContent?.trim() || clauseId;
    const text = [...node.querySelectorAll("p")].map((paragraph) => paragraph.textContent.trim()).join("\n");
    return { clauseId, label: heading, text };
  };

  const logList = document.getElementById("fineprint-log");
  const logAgentActivity = (message) => {
    const empty = logList.querySelector(".fineprint-dock__empty");
    if (empty) empty.remove();
    const item = document.createElement("li");
    const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    item.textContent = `${stamp} · ${message}`;
    logList.prepend(item);
    while (logList.children.length > 8) logList.removeChild(logList.lastChild);
  };
  const clearAgentLog = () => {
    logList.innerHTML = '<li class="fineprint-dock__empty">Waiting for an agent to inspect a choice…</li>';
  };

  const dock = document.getElementById("fineprint-dock");
  const dockToggle = document.getElementById("fineprint-dock-toggle");
  dockToggle.addEventListener("click", () => {
    const collapsed = dock.classList.toggle("is-collapsed");
    dockToggle.setAttribute("aria-expanded", String(!collapsed));
  });

  const copyPrompt = document.getElementById("copy-judge-prompt");
  const judgePrompt = document.getElementById("judge-prompt");
  copyPrompt.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(judgePrompt.value);
      copyPrompt.textContent = "Copied";
      setTimeout(() => { copyPrompt.textContent = "Copy prompt"; }, 1600);
    } catch {
      judgePrompt.select();
      copyPrompt.textContent = "Select and copy";
    }
  });

  // ---------- Countdown (Trap #5 — resets on every load, on purpose) ----------
  const INITIAL_SECONDS = 14 * 60 + 59;
  let countdownTimer;
  let countdownSeconds = INITIAL_SECONDS;
  let timerLocked = false;
  const countdownEl = document.getElementById("countdown");
  const renderCountdown = () => {
    const m = Math.floor(countdownSeconds / 60).toString().padStart(2, "0");
    const s = (countdownSeconds % 60).toString().padStart(2, "0");
    countdownEl.textContent = `${m}:${s}`;
  };
  const startCountdown = () => {
    clearInterval(countdownTimer);
    countdownSeconds = INITIAL_SECONDS;
    timerLocked = false;
    renderCountdown();
    countdownTimer = setInterval(() => {
      if (timerLocked || countdownSeconds <= 0) return;
      countdownSeconds -= 1;
      renderCountdown();
    }, 1000);
  };
  startCountdown();

  // ---------- Cookie banner ----------
  const cookieBanner = document.getElementById("cookie-banner");
  const cookiePartners = document.getElementById("cookie-partners");
  ["cookie-accept", "cookie-reject", "cookie-manage"].forEach((id) => {
    document.getElementById(id).addEventListener("click", () => {
      cookieBanner.hidden = true;
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

  // ---------- Simulated Nimbus account journey ----------
  const screens = {
    signIn: document.getElementById("signin-screen"),
    plans: document.getElementById("plans-screen"),
    detail: document.getElementById("detail-screen")
  };
  const showScreen = (screen) => Object.values(screens).forEach((element) => { element.hidden = element !== screen; });
  const closeFlow = () => showScreen(null);
  document.querySelector(".nav__signin").addEventListener("click", () => showScreen(screens.signIn));
  document.getElementById("signin-back").addEventListener("click", closeFlow);
  document.getElementById("signin-continue").addEventListener("click", () => showScreen(screens.plans));
  document.getElementById("plans-back").addEventListener("click", () => showScreen(screens.signIn));
  document.querySelectorAll(".choose-plan").forEach((button) => button.addEventListener("click", () => {
    closeFlow();
    document.body.classList.add("is-signed-in");
    document.getElementById("membership-dock").hidden = false;
    document.querySelector(".nav__signin").textContent = "Account";
    showAgentOutcome("you are signed in and your membership is ready.");
  }));
  document.getElementById("detail-back").addEventListener("click", closeFlow);
  document.querySelectorAll(".tile").forEach((tile) => {
    tile.tabIndex = 0;
    tile.setAttribute("role", "button");
    const openDetail = () => {
      document.getElementById("detail-title").textContent = tile.textContent.trim();
      showScreen(screens.detail);
    };
    tile.addEventListener("click", openDetail);
    tile.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetail(); } });
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
  const legalCopy = document.getElementById("legal-copy");
  const openTerms = () => { termsModal.hidden = false; };
  document.getElementById("terms-link").addEventListener("click", (e) => {
    e.preventDefault();
    openTerms();
  });
  ["terms-close", "terms-close-bottom"].forEach((id) => document.getElementById(id).addEventListener("click", () => { termsModal.hidden = true; }));
  termsModal.addEventListener("click", (e) => { if (e.target === termsModal) termsModal.hidden = true; });

  const trialReceipt = document.getElementById("trial-receipt");
  const upgradeReceipt = document.getElementById("upgrade-receipt");
  document.getElementById("trial-form").addEventListener("submit", (e) => {
    e.preventDefault();
    trialReceipt.hidden = false;
  });
  document.getElementById("upgrade-cta").addEventListener("click", (e) => {
    e.preventDefault();
    upgradeReceipt.hidden = false;
  });

  // ---------- Utility: visual highlight hook for WebMCP tool calls ----------
  window.highlightElement = function (mcpId) {
    const el = document.querySelector(`[data-mcp-id="${mcpId}"]`);
    if (!el) return;
    el.classList.add("mcp-highlight");
    setTimeout(() => el.classList.remove("mcp-highlight"), 2000);
  };

  const outcome = document.getElementById("agent-outcome");
  const outcomeCopy = document.getElementById("agent-outcome-copy");
  const showAgentOutcome = (message) => {
    outcomeCopy.textContent = `Agent update: ${message}`;
    outcome.hidden = false;
  };
  document.getElementById("agent-outcome-dismiss").addEventListener("click", () => {
    outcome.hidden = true;
  });

  const applyEssentialCookies = () => {
    cookiePartners.checked = false;
    cookiePartners.disabled = true;
    cookieBanner.hidden = false;
    cookieBanner.classList.add("agent-resolved");
    document.getElementById("cookie-agent-state").hidden = false;
    window.highlightElement("cookie-partners-row");
  };
  const lockTimerState = () => {
    if (timerLocked) return;
    timerLocked = true;
    clearInterval(countdownTimer);
    document.getElementById("upgrade-banner").classList.add("is-locked");
    countdownEl.textContent = "NO DEADLINE";
    document.getElementById("upgrade-cta").textContent = "Price held";
    window.highlightElement("upgrade-cta");
  };
  const DECISION_LABELS = {
    "cookie-consent": "essential cookies only",
    "account-terms": "uncheck bundled marketing consent",
    "trial-membership": "surface the $49.99/month renewal",
    "recommendation-permissions": "decline extra recommendation permissions",
    "founding-member-offer": "freeze the offer timer"
  };
  const applySaferDefaultFor = (decision) => {
    if (decision === "cookie-consent") {
      applyEssentialCookies();
      return { changes: ["partner sharing off"], message: "essential cookies selected; partner sharing is off." };
    }
    if (decision === "account-terms") {
      document.querySelector("#terms-row input").checked = false;
      document.getElementById("terms-row").classList.add("agent-resolved");
      window.highlightElement("terms-row");
      return { changes: ["marketing consent unchecked"], message: "the bundled partner-offers checkbox is now unchecked." };
    }
    if (decision === "trial-membership") {
      document.querySelector(".signup-card").classList.add("agent-resolved");
      document.getElementById("trial-btn").textContent = "Review $49.99/month before starting";
      window.highlightElement("trial-btn");
      return { changes: ["trial renewal surfaced"], message: "the trial button now shows the $49.99/month renewal." };
    }
    if (decision === "recommendation-permissions") {
      document.getElementById("permissions-decline").click();
      document.querySelector(".personalize-strip").classList.add("agent-resolved");
      document.getElementById("personalize-btn").textContent = "Watch-history recommendations on";
      window.highlightElement("personalize-btn");
      return { changes: ["unnecessary permissions avoided"], message: "location, contacts, and notifications were declined." };
    }
    if (decision === "founding-member-offer") {
      lockTimerState();
      return { changes: ["timer frozen"], message: "the offer timer is frozen; no deadline applies." };
    }
    throw new Error(`Unknown FinePrint decision: ${decision}`);
  };

  const showPolicySection = (clauseId) => {
    const clause = readClause(clauseId);
    const node = getClauseNode(clauseId);
    openTerms();
    clauseNodes.forEach((section) => section.classList.remove("clause-highlight"));
    node.classList.add("clause-highlight");
    node.scrollIntoView({ block: "center", behavior: "smooth" });
    window.highlightElement(clauseId === "cookie-partners" || clauseId === "cookie-advertising" || clauseId === "cookie-essential"
      ? (clauseId === "cookie-essential" ? "cookie-reject" : clauseId === "cookie-advertising" ? "cookie-accept" : "cookie-partners-row")
      : clauseId === "terms-trial" ? "trial-btn"
      : clauseId === "terms-communications" ? "terms-row"
      : clauseId === "founding-offer" ? "upgrade-cta"
      : clauseId.startsWith("recommendation") ? "personalize-btn"
      : "terms-link");
    return clause;
  };

  const resetDemo = () => {
    cookiePartners.checked = true;
    cookiePartners.disabled = false;
    cookieBanner.hidden = false;
    cookieBanner.classList.remove("agent-resolved");
    document.getElementById("cookie-agent-state").hidden = true;
    document.querySelector("#terms-row input").checked = true;
    document.getElementById("terms-row").classList.remove("agent-resolved");
    document.querySelector(".signup-card").classList.remove("agent-resolved");
    document.getElementById("trial-btn").textContent = "Start your free trial";
    document.querySelector(".personalize-strip").classList.remove("agent-resolved");
    document.getElementById("personalize-btn").textContent = "Turn on";
    document.getElementById("upgrade-banner").classList.remove("is-locked");
    document.getElementById("upgrade-cta").textContent = "Claim price";
    trialReceipt.hidden = true;
    upgradeReceipt.hidden = true;
    outcome.hidden = true;
    modal.hidden = true;
    termsModal.hidden = true;
    safeActionModal.hidden = true;
    clauseNodes.forEach((section) => section.classList.remove("clause-highlight"));
    document.body.classList.remove("is-signed-in");
    document.getElementById("membership-dock").hidden = true;
    document.querySelector(".nav__signin").textContent = "Sign in";
    closeFlow();
    startCountdown();
    clearAgentLog();
  };
  document.getElementById("reset-demo").addEventListener("click", () => {
    resetDemo();
    logAgentActivity("Demo reset. Cookie banner, terms, trial, timer, and receipts restored.");
  });

  const policyReferencesFor = (elementId) => getRuntimeProfile(elementId).clauses.map((clauseId) => readClause(clauseId));
  const listConsentDecisions = () => {
    const groups = {};
    Object.entries(pagePolicy.elements).forEach(([choiceId, details]) => {
      groups[details.decision] ||= [];
      groups[details.decision].push({
        choiceId,
        label: details.label,
        defaultSelected: details.defaultSelected
      });
    });
    return Object.entries(groups).map(([decision, choices]) => ({ decision, choices }));
  };

  // ---------- WebMCP: discoverable, data-driven consent tools ----------
  async function registerWebMCPTools() {
    const statusCopy = document.getElementById("agent-status-copy");
    const status = document.getElementById("agent-status");
    if (!document.modelContext?.registerTool) {
      statusCopy.textContent = "Agent tools unavailable in this browser";
      status.classList.add("is-unavailable");
      console.info("FinePrint: WebMCP is unavailable in this browser.");
      return;
    }

    const elementIdSchema = {
      type: "string",
      enum: Object.keys(pagePolicy.elements),
      description: "The data-mcp-id of a choice declared in this page's policy."
    };
    const clauseIdSchema = {
      type: "string",
      enum: clauseIds,
      description: "Stable clause id from this page's terms, cookie notice, or permission request."
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
        name: "listConsentDecisions",
        title: "List consent decisions",
        description: "List every consent, privacy, subscription, and offer decision on this page, with choice ids, labels, and whether each choice is selected by default. Start here before inspecting a specific control.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: () => {
          const decisions = listConsentDecisions();
          logAgentActivity("Listed all consent decisions on the page.");
          return result({ decisions, source: "page-declared policy" });
        }
      },
      {
        name: "getChoiceDetails",
        title: "Get choice details",
        description: "Return the site's declared decision group, default selection state, and policy references for a visible choice.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => {
          const p = inspect(elementId);
          const policyReferences = policyReferencesFor(elementId);
          logAgentActivity(`Inspected ${p.label} (${elementId}).`);
          return result({ elementId, label: p.label, decision: p.decision, defaultSelected: p.defaultSelected, policyReferences });
        }
      },
      {
        name: "getDecisionImpact",
        title: "Get decision impact",
        description: "Return the site's declared data sharing, financial commitment, renewal, reversibility, and timing for one choice.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => {
          const p = inspect(elementId);
          logAgentActivity(`Read impact for ${p.label}.`);
          return result({ elementId, consequences: p.consequences, disclosures: p.disclosures || {}, policyReferences: policyReferencesFor(elementId), source: "page-declared policy" });
        }
      },
      {
        name: "getAvailableChoices",
        title: "Get available choices",
        description: "List the declared choices in the same decision group, including each choice's impact and whether it is selected by default.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => {
          const choices = availableChoices(elementId);
          logAgentActivity(`Listed alternatives for ${elementId}.`);
          return result({ elementId, choices, source: "page-declared policy" });
        }
      },
      {
        name: "getPolicyReferences",
        title: "Get policy references",
        description: "Return the page policy sections that govern a choice, including clause ids an agent can open with showPolicySection.",
        inputSchema: { type: "object", properties: { elementId: elementIdSchema }, required: ["elementId"] },
        annotations: { readOnlyHint: true },
        execute: ({ elementId }) => {
          const p = inspect(elementId);
          logAgentActivity(`Looked up policy references for ${p.label}.`);
          return result({ elementId, policyReferences: policyReferencesFor(elementId) });
        }
      },
      {
        name: "getPolicySection",
        title: "Get policy section",
        description: "Return the full on-page text of a terms, privacy, cookie, or permission section. The agent should explain this text; the page does not interpret it.",
        inputSchema: { type: "object", properties: { clauseId: clauseIdSchema }, required: ["clauseId"] },
        annotations: { readOnlyHint: true },
        execute: ({ clauseId }) => {
          const clause = readClause(clauseId);
          logAgentActivity(`Read clause ${clause.label}.`);
          return result({ ...clause, source: "on-page legal text" });
        }
      },
      {
        name: "showPolicySection",
        title: "Show policy section",
        description: "Open the terms and privacy document, scroll to a clause, and highlight it so the human can read the same text the agent inspected.",
        inputSchema: { type: "object", properties: { clauseId: clauseIdSchema }, required: ["clauseId"] },
        annotations: { readOnlyHint: true },
        execute: ({ clauseId }) => {
          const clause = showPolicySection(clauseId);
          logAgentActivity(`Opened ${clause.label} on the page.`);
          return result({ shown: true, ...clause });
        }
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
          if (!confirmed) {
            logAgentActivity("User kept the current privacy choice.");
            return result({ changed: false, message: "The user kept the current simulated choice." });
          }
          window.highlightElement(targetId);
          const message = preference === "essential-cookies" ? "essential cookies selected; partner sharing is off." : "location, contacts, and notifications were declined.";
          showAgentOutcome(message);
          logAgentActivity(`Applied ${preference} after confirmation.`);
          return result({ changed: true, selected: targetId, preference, policyReferences: policyReferencesFor(targetId) });
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
          if (!confirmed) {
            logAgentActivity("User kept the running demo timer.");
            return result({ changed: false, message: "The user kept the running demo timer." });
          }
          lockTimerState();
          showAgentOutcome("the offer timer is frozen; no deadline applies.");
          logAgentActivity("Timer frozen. No real deadline applies.");
          return result({ changed: true, timerLocked: true, offerHasRealDeadline: false });
        }
      },
      {
        name: "applySaferDefaults",
        title: "Apply safer defaults",
        description: "Apply the safer declared option for ONE decision after visible confirmation. Pass decision as cookie-consent, account-terms, trial-membership, recommendation-permissions, or founding-member-offer. Demo one trap at a time. This never starts a trial, buys a plan, or transmits data.",
        inputSchema: {
          type: "object",
          properties: {
            decision: {
              type: "string",
              enum: ["cookie-consent", "account-terms", "trial-membership", "recommendation-permissions", "founding-member-offer"],
              description: "The single consent decision to update. Required for the one-by-one demo."
            }
          },
          required: ["decision"],
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        execute: async ({ decision }) => {
          const confirmed = await requestSafeAction({ label: DECISION_LABELS[decision] });
          if (!confirmed) {
            logAgentActivity(`User kept the current ${decision} choice.`);
            return result({ changed: false, decision, message: "The user kept the current demo choice." });
          }
          const applied = applySaferDefaultFor(decision);
          showAgentOutcome(applied.message);
          logAgentActivity(`Applied safer default for ${decision} after confirmation.`);
          return result({ changed: true, decision, changes: applied.changes });
        }
      },
      {
        name: "resetDemo",
        title: "Reset demo",
        description: "Restore cookie, terms, trial, permission, timer, and receipt state so a judge can re-run the FinePrint demonstration.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
        execute: () => {
          resetDemo();
          logAgentActivity("Demo reset from WebMCP.");
          return result({ reset: true });
        }
      }
    ];
    await Promise.all(tools.map((tool) => document.modelContext.registerTool(tool)));
    status.classList.add("is-ready");
    statusCopy.textContent = "Agent tools ready";
    console.info(`FinePrint: registered ${tools.length} WebMCP tools.`);
  }

  registerWebMCPTools().catch((error) => {
    document.getElementById("agent-status-copy").textContent = "Agent tools unavailable in this browser";
    document.getElementById("agent-status").classList.add("is-unavailable");
    console.warn("FinePrint: WebMCP registration failed.", error);
  });
});
