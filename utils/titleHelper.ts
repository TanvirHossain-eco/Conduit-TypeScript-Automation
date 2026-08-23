// utils/titleHelper.ts
// ══════════════════════════════════════════════════════════════════════════════
// Unique title generator. A single counter shared by every test in the run,
// so every article created gets its own number — e.g. "Automation Testing 1".
// ══════════════════════════════════════════════════════════════════════════════

let articleCounter = 0;

export function getUniqueTitle(baseTitle: string): string {
  articleCounter += 1;
  return `${baseTitle} ${articleCounter}`;
}
