/**
 * FinePrint — risk profile data
 * ------------------------------------
 * Hand-authored "what actually happens" data for every trap element on the
 * page, keyed by the element's data-mcp-id. FinePrint's analysis layer uses
 * this for plain-language explanations, accessibility adaptation, and
 * dark-pattern detection. The website's WebMCP tools expose only neutral,
 * machine-readable decision facts from the policy declaration in index.html.
 *
 * Schema per entry:
 *   label            - human name for the element
 *   summary          - one or two plain-language sentences: what clicking this does
 *   consequences     - structured outcome data
 *     dataShared        - array of data types shared, [] if none
 *     moneyCommitted    - string or null
 *     recurringCharge   - string or null
 *     reversible        - boolean
 *     timeLimit         - string or null (e.g. "trial ends in 14 days")
 *   darkPatterns     - array of flags from a fixed vocabulary (see below)
 *   saferChoice      - { mcpId, label, why } pointing at the lower-risk alternative
 *                       on the page, or null if this option has no safer sibling
 */

const CONSENT_DATA = {

  // ---------------- Trap #1: cookie banner ----------------
  "cookie-accept": {
    label: "Accept all (cookies)",
    summary: "Sets tracking cookies and shares your browsing activity with Nimbus's advertising partners, in addition to the cookies needed to run the site.",
    consequences: {
      dataShared: ["browsing activity", "device identifiers", "shared with ~40 advertising partners"],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: true,
      timeLimit: null
    },
    darkPatterns: ["visualAsymmetry", "hiddenOptOut"],
    saferChoice: { mcpId: "cookie-reject", label: "Reject all", why: "Keeps only the cookies required for the site to function — no data goes to advertising partners." }
  },
  "cookie-partners-row": {
    label: "Share activity with advertising partners",
    summary: "This optional tracking choice is already selected. Leaving it selected allows Nimbus to share browsing activity and device identifiers with advertising partners.",
    consequences: {
      dataShared: ["browsing activity", "device identifiers", "advertising partner identifiers"],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: true,
      timeLimit: null
    },
    darkPatterns: ["preCheckedBox"],
    saferChoice: { mcpId: "cookie-reject", label: "Reject all", why: "Keeps only the cookies required for the site to function and turns off partner sharing." }
  },
  "cookie-reject": {
    label: "Reject all (cookies)",
    summary: "Keeps only the cookies required for the site to work. No browsing data is shared with advertising partners.",
    consequences: {
      dataShared: [],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: true,
      timeLimit: null
    },
    darkPatterns: [],
    saferChoice: null
  },
  "cookie-manage": {
    label: "Manage preferences (cookies)",
    summary: "Opens granular controls to choose exactly which cookie categories to allow, instead of an all-or-nothing choice.",
    consequences: {
      dataShared: [],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: true,
      timeLimit: null
    },
    darkPatterns: [],
    saferChoice: null
  },

  // ---------------- Trap #2: terms checkbox ----------------
  "terms-row": {
    label: "Terms of Service checkbox",
    summary: "Pre-checked by default. Agreeing also opts you into 'occasional partner offers' — recurring marketing email from third parties — bundled into the same checkbox as the actual Terms of Service.",
    consequences: {
      dataShared: ["email address shared with marketing partners"],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: false,
      timeLimit: null
    },
    darkPatterns: ["preCheckedBox", "buriedClause"],
    saferChoice: null
  },
  "terms-link": {
    label: "Terms of Service & Privacy Policy (full text)",
    summary: "Contains a mandatory arbitration clause, which waives your right to join a class-action lawsuit, and a data-sharing clause covering 'affiliates and partners.' Both are placed after several thousand words of standard boilerplate.",
    consequences: {
      dataShared: ["as described in the privacy policy: usage data, device data, shared with affiliates"],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: false,
      timeLimit: null
    },
    darkPatterns: ["buriedClause"],
    saferChoice: null
  },

  // ---------------- Trap #3: free trial button ----------------
  "trial-btn": {
    label: "Start your free trial",
    summary: "Starts a 14-day free trial that automatically converts into a paid subscription at $49.99/month unless cancelled before the trial ends. A payment card is required and charged immediately if the trial isn't cancelled in time.",
    consequences: {
      dataShared: ["payment card details"],
      moneyCommitted: "$49.99/month after the trial, charged automatically",
      recurringCharge: "$49.99/month",
      reversible: true,
      timeLimit: "14-day trial — cancel before it ends to avoid the charge"
    },
    darkPatterns: ["falseUrgency", "buriedClause"],
    saferChoice: null
  },

  // ---------------- Trap #4: permissions modal ----------------
  "personalize-btn": {
    label: "Turn on personalized recommendations",
    summary: "Opens a permissions request that asks for far more than recommendations need: precise location, your contacts list, and push notifications.",
    consequences: {
      dataShared: [],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: true,
      timeLimit: null
    },
    darkPatterns: [],
    saferChoice: null
  },
  "permissions-allow": {
    label: "Allow all (permissions)",
    summary: "Grants Nimbus access to your precise location, your entire contacts list, and permission to send push notifications — none of which are required to recommend shows based on what you watch.",
    consequences: {
      dataShared: ["precise location", "contacts list", "push notification access"],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: true,
      timeLimit: null
    },
    darkPatterns: ["visualAsymmetry"],
    saferChoice: { mcpId: "permissions-decline", label: "Not now", why: "Recommendations can be generated from your watch history alone — location and contacts aren't required." }
  },
  "permissions-decline": {
    label: "Not now (permissions)",
    summary: "Declines the location, contacts, and notification requests. Recommendations still work, based on your watch history.",
    consequences: {
      dataShared: [],
      moneyCommitted: null,
      recurringCharge: null,
      reversible: true,
      timeLimit: null
    },
    darkPatterns: [],
    saferChoice: null
  },

  // ---------------- Trap #5: urgency banner ----------------
  "upgrade-cta": {
    label: "Claim price (upgrade banner)",
    summary: "The countdown timer resets every time the page is reloaded — the '$4.99/mo founding price' isn't actually time-limited. Clicking commits to an annual plan billed upfront.",
    consequences: {
      dataShared: ["payment card details"],
      moneyCommitted: "$59.88 billed immediately (annual plan)",
      recurringCharge: "$59.88/year",
      reversible: true,
      timeLimit: null
    },
    darkPatterns: ["falseUrgency"],
    saferChoice: null
  }
};

// Expose the fixed dark-pattern vocabulary alongside the data, so a
// future WebMCP tool can validate/describe flags consistently.
const DARK_PATTERN_DEFINITIONS = {
  preCheckedBox: "An opt-in was pre-selected for you, so inaction counts as consent.",
  hiddenOptOut: "The option to decline is present but visually de-emphasized.",
  falseUrgency: "A countdown or scarcity claim isn't actually tied to a real deadline.",
  visualAsymmetry: "One choice is styled to draw the eye far more than the other.",
  buriedClause: "An important term is placed where it's unlikely to be read."
};

const ACCESSIBLE_SUMMARY_STYLES = {
  standard: (profile) => profile.summary,
  elderly: (profile) => `Before you choose: ${profile.summary} Take your time. You do not need to decide because a timer or bright button is pressuring you.`,
  lowVision: (profile) => `${profile.label}. ${profile.summary} Key result: ${profile.consequences.moneyCommitted || (profile.consequences.dataShared.length ? `data shared: ${profile.consequences.dataShared.join(", ")}` : "no extra data shared")}.`
};
