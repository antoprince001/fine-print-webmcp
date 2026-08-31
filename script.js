/**
 * Consent Copilot — page interactivity
 * -------------------------------------
 * Plain DOM behavior only — no WebMCP yet. CONSENT_DATA (data.js) is already
 * loaded and keyed by data-mcp-id, ready for tools to read from.
 *
 * WebMCP registration goes here later, e.g.:
 *   navigator.mcp.registerTool({ name: "explainAction", ... })
 * reading from CONSENT_DATA[elementId] and highlighting the element via
 * highlightElement(elementId) below.
 */

document.addEventListener("DOMContentLoaded", () => {

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

  // ---------- Terms link (Trap #2) ----------
  document.getElementById("terms-link").addEventListener("click", (e) => {
    e.preventDefault();
    alert("This would open the full Terms of Service — a long document with an arbitration clause and a data-sharing clause buried well past the fold.");
  });

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
});
