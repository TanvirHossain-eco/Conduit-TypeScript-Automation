// config/constants.ts
// ══════════════════════════════════════════════════════════════════════════════
// Non-secret, shared constants used by more than one page object / spec.
// ══════════════════════════════════════════════════════════════════════════════

// The shared error-messages locator used by BOTH the login form (beforeEach)
// and the article editor form (Step 1) — this is the same <ul class=
// "error-messages"> component the RealWorld/Conduit template reuses across
// every form. Defined once here so both call sites can't drift apart.
export const ERROR_MESSAGES_LOCATOR = "ul[class='error-messages'] li";

// Matches any title of the form "Automation Testing <number>"
export const ARTICLE_TITLE_REGEX = /^Automation Testing (\d+)$/;
