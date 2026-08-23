// types.ts
// ══════════════════════════════════════════════════════════════════════════════
// Shared types used across api/, pages/, and tests/.
// ══════════════════════════════════════════════════════════════════════════════

export interface ArticleRef {
  title?: string;
  slug?: string;
}

export interface ConduitArticle {
  title: string;
  slug: string;
  [key: string]: unknown;
}

export interface ConduitUser {
  token: string;
  email: string;
  username: string;
  [key: string]: unknown;
}
