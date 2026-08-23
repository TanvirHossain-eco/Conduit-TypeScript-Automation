// api/conduitApi.ts
// ══════════════════════════════════════════════════════════════════════════════
// Direct API calls used ONLY as a fallback when no matching article is found
// via the UI (see the cascade comments in tests/conduit.spec.ts).
// ══════════════════════════════════════════════════════════════════════════════

import { APIRequestContext, expect } from '@playwright/test';
import { API_URL, EMAIL, PASSWORD } from '../config/env';
import { ConduitArticle, ConduitUser } from '../types';

export async function loginViaApi(request: APIRequestContext): Promise<ConduitUser> {
  const response = await request.post(`${API_URL}/users/login`, {
    data: { user: { email: EMAIL, password: PASSWORD } },
  });
  if (!response.ok()) {
    console.error(`loginViaApi failed: ${response.status()} ${response.statusText()}`);
    console.error(await response.text());
  }
  expect(response.ok()).toBeTruthy();
  const { user }: { user: ConduitUser } = await response.json();
  return user;
}

export async function createArticleViaApi(
  request: APIRequestContext,
  token: string,
  title: string
): Promise<ConduitArticle> {
  const response = await request.post(`${API_URL}/articles/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      article: {
        title,
        description: 'Playwright testing',
        body: 'This article was created by an automated test.',
        tagList: 'Testing',
      },
    },
  });
  if (!response.ok()) {
    console.error(`createArticleViaApi failed: ${response.status()} ${response.statusText()}`);
    console.error(await response.text());
  }
  expect(response.ok()).toBeTruthy();
  const { article }: { article: ConduitArticle } = await response.json();
  return article;
}

export async function editArticleViaApi(
  request: APIRequestContext,
  token: string,
  slug: string,
  newBody: string
): Promise<ConduitArticle> {
  const response = await request.put(`${API_URL}/articles/${slug}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { article: { body: newBody } },
  });
  if (!response.ok()) {
    console.error(`editArticleViaApi failed: ${response.status()} ${response.statusText()}`);
    console.error(await response.text());
  }
  expect(response.ok()).toBeTruthy();
  const { article }: { article: ConduitArticle } = await response.json();
  return article;
}
