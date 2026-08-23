import { test, expect, TestInfo } from '@playwright/test';

import { BASE_URL, API_URL, EMAIL, PASSWORD, INVALID_PASSWORD, AUTHOR_USERNAME } from '../config/env';
import { getUniqueTitle } from '../utils/titleHelper';
import { loginViaApi, createArticleViaApi, editArticleViaApi } from '../api/conduitApi';
import { LoginPage } from '../pom/LoginPage';
import { ArticleEditorPage } from '../pom/ArticleEditorPage';
import { ArticlePage } from '../pom/ArticlePage';
import { FeedPage } from '../pom/FeedPage';
import { SettingsPage } from '../pom/SettingsPage';
import { ArticleRef, ConduitArticle, ConduitUser } from '../types';

// ══════════════════════════════════════════════════════════════════════════════
// SHARED STATE (per worker — not shared across parallel workers)
// ─────────────────────────────────────────────────────────────────────────────
// step1Needed    → drives Step 1's test.skip() guard (see beforeEach below).
// currentArticle → the ONE article Steps 1/2/3 all operate on in this run.
//                  Populated by whichever of {discovery, Step 1, Step 2}
//                  establishes it first — see the cascade explanation on
//                  beforeEach and on Step 2 / Step 3 below.
// ══════════════════════════════════════════════════════════════════════════════
let step1Needed: boolean = true;
let currentArticle: ArticleRef = { title: undefined, slug: undefined };

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE
// ══════════════════════════════════════════════════════════════════════════════
test.describe('Conduit - Articles & Settings', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // beforeEach: TWO-STAGE LOGIN (negative → positive) + ARTICLE DISCOVERY
  // ─────────────────────────────────────────────────────────────────────────
  // Stage 1 — Negative test:
  //   Attempt login with INVALID_PASSWORD. The API returns an error.
  //   Assert the exact error message using the error-messages locator.
  //   This is a hard, blocking assertion — the error is GUARANTEED to
  //   appear here, so there's no risk of it hanging on a case that never
  //   fires (unlike the Step 1 usage).
  //
  // Stage 2 — Valid login:
  //   Re-submit the form with the correct PASSWORD. Assert "Your Feed" tab.
  //
  // Discovery (the part that changed vs. earlier versions):
  //   Only performs a live scan of the Global Feed when currentArticle is
  //   NOT already known. If an earlier test in THIS SAME WORKER already
  //   established currentArticle (Step 1 created it, or Step 2 created it
  //   via API), that value is trusted as-is and discovery is skipped
  //   entirely.
  //
  //   This is the actual fix for "separate article per step": re-running
  //   live discovery on every test and blindly overwriting currentArticle
  //   is racy — if the site's feed index has any lag, a fresh discovery can
  //   come back empty and wipe out a value we already know is correct,
  //   making the next step wrongly think no article exists and create a
  //   second one. Trusting known in-memory state first removes that race
  //   for the common case where Steps 1→5 run sequentially in one worker.
  //
  //   Live discovery is still the right tool the FIRST time a worker's
  //   currentArticle is empty — e.g. this worker's first test, or every
  //   test when Step 1 was excluded from the run entirely (no test in this
  //   worker has set currentArticle yet).
  // ══════════════════════════════════════════════════════════════════════════
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    const feedPage  = new FeedPage(page);

    // ── Navigate to Sign in ──────────────────────────────────────────────
    await loginPage.goto(BASE_URL);
    await loginPage.clickSignIn();

    // ── Stage 1: Invalid password attempt ────────────────────────────────
    await loginPage.fillEmail(EMAIL);
    await loginPage.fillPassword(INVALID_PASSWORD);
    await loginPage.submit();

    // Assert: error message is visible with correct locator
    await expect(
      loginPage.errorMessages,
      '❌ Error message list not visible after invalid login attempt'
    ).toBeVisible();
    await expect(
      loginPage.errorMessages,
      '❌ Expected "email or password is invalid" in error message'
    ).toContainText('email or password is invalid');
    console.log('✅ Stage 1 — Negative login validated: "email or password is invalid"');

    // ── Stage 2: Valid login ──────────────────────────────────────────────
    // Page stays on the Sign in form after a failed attempt.
    // Refill both fields to ensure no stale input state.
    await loginPage.fillEmail(EMAIL);
    await loginPage.fillPassword(PASSWORD);
    await loginPage.submit();

    await expect(
      loginPage.yourFeedText,
      '❌ Valid login failed — "Your Feed" tab not visible'
    ).toBeVisible();
    console.log('✅ Stage 2 — Login successful with valid credentials');

    // ── Article discovery — ONLY if we don't already know one ─────────────
    if (currentArticle.title && currentArticle.slug) {
      step1Needed = false;
      console.log(`✅ Reusing article already known in this worker: "${currentArticle.title}" — skipping live discovery`);
    } else {
      const discovered = await feedPage.findLatestAutomationTestingArticle(BASE_URL, AUTHOR_USERNAME);

      if (discovered) {
        currentArticle = discovered;
        step1Needed    = false;
        console.log(`✅ Discovery — Article found: "${discovered.title}" by ${AUTHOR_USERNAME} → Step 1 will be SKIPPED`);
      } else {
        currentArticle = { title: undefined, slug: undefined };
        step1Needed    = true;
        console.log(`ℹ️ Discovery — No matching article found → Step 1 will RUN`);
      }
    }
  });


  // ══════════════════════════════════════════════════════════════════════════
  // Step 1: Create New Article
  // ─────────────────────────────────────────────────────────────────────────
  // Skipped automatically when beforeEach already knows about an article
  // (either reused in-memory, or found via discovery).
  //
  // Under parallel execution, each worker maintains its own independent
  // articleCounter, so two workers CAN legitimately try to publish the same
  // title ("Automation Testing 1", etc.) at close to the same time. The API
  // rejects the second one with a "title must be unique" validation error,
  // rendered into the SAME <ul class="error-messages"> component the login
  // form uses.
  //
  // Unlike the login check in beforeEach — where the error is guaranteed to
  // appear — here it may legitimately never show up (that's the common,
  // successful case). So this uses a short waitFor(...).catch(() => false)
  // instead of a hard toBeVisible() assertion: a blocking assert would hang
  // for the full timeout and fail the test on every ordinary, non-colliding
  // publish. On a collision, it retries with a fresh title instead of
  // failing outright.
  // ══════════════════════════════════════════════════════════════════════════
  test('Step 1: Create New Article', async ({ page }, testInfo: TestInfo) => {

    // ── Skip guard ────────────────────────────────────────────────────────
    test.skip(
      !step1Needed,
      `⏭️ Existing article "${currentArticle.title}" found — Step 1 not required`
    );

    const editorPage = new ArticleEditorPage(page);

    await editorPage.clickNewArticle();
    await expect(page).toHaveURL(/.*\/editor/);

    let title: string = getUniqueTitle('Automation Testing');

    await editorPage.fillTitle(title);
    await editorPage.fillDescription('Playwright testing');
    await editorPage.fillBody('This article was created by an automated test.');
    await editorPage.fillTags('Testing');

    const MAX_ATTEMPTS = 3;
    let created = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !created; attempt++) {
      await editorPage.clickPublish();

      // Non-blocking — does not stay stuck when no error appears
      const hasDuplicateTitleError: boolean = await editorPage.hasDuplicateTitleError(5_000);

      if (hasDuplicateTitleError) {
        const errorText = await editorPage.getErrorText();
        console.log(`ℹ️ Article has created with same Title Name: "${title}" (server: "${errorText}")`);
        console.log(`↻ Retrying with a new title (attempt ${attempt}/${MAX_ATTEMPTS})...`);

        // Fold in the worker index + a timestamp so the retried title is
        // extremely unlikely to collide again, even against other workers.
        title = `${getUniqueTitle('Automation Testing')}-w${testInfo.workerIndex}-${Date.now()}`;
        await editorPage.fillTitle(title);
        continue;
      }

      // No duplicate-title error — confirm the article actually published
      await expect(page).toHaveURL(/.*\/article\/.*/, { timeout: 15_000 });
      await expect(
        page.getByRole('heading', { name: title }),
        `❌ Article heading "${title}" not visible after publishing`
      ).toBeVisible();

      console.log(`✅ Article Created: "${title}"`);
      created = true;
    }

    expect(
      created,
      `❌ Failed to create a uniquely-titled article after ${MAX_ATTEMPTS} attempts`
    ).toBeTruthy();

    // Step 1 is the ONLY step that creates via the UI. This is the single
    // article Steps 2 & 3 will now reuse (see beforeEach + the cascade below).
    currentArticle = { title, slug: page.url().split('/article/').pop() };
    console.log(`✅ Step 1 — Article "${title}" created (slug: ${currentArticle.slug})`);
  });


  // ══════════════════════════════════════════════════════════════════════════
  // Step 2: Edit Article
  // ─────────────────────────────────────────────────────────────────────────
  // Cascade rule 1 of 2:
  //   • currentArticle already known (Step 1 ran, or was found by discovery)
  //       → reuse it via the UI. Does NOT call createArticleViaApi.
  //   • currentArticle unknown (Step 1 did not execute in this run)
  //       → Step 2 is next in line → calls createArticleViaApi itself.
  // ══════════════════════════════════════════════════════════════════════════
  test('Step 2: Edit Article', async ({ page, request }) => {
    const articlePage = new ArticlePage(page);
    const editorPage  = new ArticleEditorPage(page);

    if (currentArticle.title && currentArticle.slug) {
      // Narrowed to plain strings once, right after the guard above, so the
      // rest of this branch (including calls after an `await`, where
      // TypeScript would otherwise widen currentArticle.title/.slug back to
      // `string | undefined`) can use them directly.
      const { title, slug } = currentArticle as { title: string; slug: string };

      console.log(`Using existing article "${title}" — editing via UI (Step 1 already produced it)`);

      await articlePage.goto(BASE_URL, slug);
      await expect(articlePage.heading(title)).toBeVisible();
      await expect(articlePage.authorLink).toHaveText(AUTHOR_USERNAME);
      await articlePage.clickEditArticle();

    } else {
      console.log('Step 1 did not produce an article — Step 2 creating one via createArticleViaApi');
      const user: ConduitUser       = await loginViaApi(request);
      const newTitle: string        = getUniqueTitle('Automation Testing');
      const article: ConduitArticle = await createArticleViaApi(request, user.token, newTitle);
      currentArticle = { title: article.title, slug: article.slug };

      await editorPage.gotoEditor(BASE_URL, article.slug);
    }

    // ── Edit body only — title left unchanged ─────────────────────────────
    const updatedBody = `Updated body content — ${Date.now()}`;
    // Wait for 10 seconds for the article to be updated
    await page.waitForTimeout(10_000);
    await editorPage.fillBody(updatedBody);
    // wait for 10 seconds for the article to be updated
    await page.waitForTimeout(10_000);
    await editorPage.clickPublish();
    // wait for 10 seconds for the article to be published
    await page.waitForTimeout(10_000);

    const title = currentArticle.title as string;
    const slug  = currentArticle.slug as string;

    await expect(page).toHaveURL(`${BASE_URL}/article/${slug}`);
    await expect(
      page.getByRole('heading', { name: title }),
      '❌ Title changed unexpectedly after editing'
    ).toBeVisible();
    await expect(
      page.getByText(updatedBody),
      '❌ Updated body not visible after saving'
    ).toBeVisible();

    console.log(`✅ Step 2 — Article "${title}" edited. New body: "${updatedBody}"`);
  });


  // ══════════════════════════════════════════════════════════════════════════
  // Step 3: Delete Article
  // ─────────────────────────────────────────────────────────────────────────
  // Cascade rule 2 of 2:
  //   • currentArticle already known (from Step 1, Step 2, or discovery)
  //       → reuse it via the UI. Does NOT call createArticleViaApi.
  //   • currentArticle unknown (neither Step 1 nor Step 2 executed)
  //       → Step 3 is the last resort → creates AND edits via the API
  //         (the Step 1 + Step 2 equivalent), then deletes via the UI.
  // ══════════════════════════════════════════════════════════════════════════
  test('Step 3: Delete Article', async ({ page, request }) => {
    const articlePage = new ArticlePage(page);

    if (currentArticle.title && currentArticle.slug) {
      const { title, slug } = currentArticle as { title: string; slug: string };

      console.log(`Using existing article "${title}" — deleting via UI (already produced by an earlier step)`);

      await articlePage.goto(BASE_URL, slug);
      await expect(articlePage.heading(title)).toBeVisible();
      await expect(articlePage.authorLink).toHaveText(AUTHOR_USERNAME);

    } else {
      console.log('Neither Step 1 nor Step 2 produced an article — Step 3 creating (and editing) one via the API');
      const user: ConduitUser       = await loginViaApi(request);
      const newTitle: string        = getUniqueTitle('Automation Testing');
      const created: ConduitArticle = await createArticleViaApi(request, user.token, newTitle);
      const updatedBody             = `Updated body content — ${Date.now()}`;
      const edited: ConduitArticle  = await editArticleViaApi(request, user.token, created.slug, updatedBody);
      currentArticle                = { title: edited.title, slug: edited.slug };

      await articlePage.goto(BASE_URL, edited.slug);
      await expect(articlePage.heading(currentArticle.title as string)).toBeVisible();
    }

    const title = currentArticle.title as string;
    const slug  = currentArticle.slug as string;

    // ── Delete button visible (author confirmation) ────────────────────────
    await expect(articlePage.deleteArticleButton, '❌ Delete button not visible — may not be the article author').toBeVisible();
    await articlePage.clickDeleteArticle();

    await expect(page).toHaveURL(`${BASE_URL}/`);

    const getResponse = await request.get(`${API_URL}/articles/${slug}`);
    expect(
      getResponse.status(),
      `❌ Expected 404 for deleted article "${slug}", got ${getResponse.status()}`
    ).toBe(404);

    console.log(`✅ Step 3 — Article "${title}" deleted and verified via API (404)`);
  });


  // ══════════════════════════════════════════════════════════════════════════
  // Step 4: Filter Articles by Tag
  // ══════════════════════════════════════════════════════════════════════════
  test('Step 4: Filter Articles by Tag', async ({ page }) => {
    const feedPage = new FeedPage(page);

    const firstTag = feedPage.firstTag();
    await expect(
      firstTag,
      '❌ No tags found in the sidebar — feed may still be loading'
    ).toBeVisible();

    const tagName: string = (await firstTag.textContent())?.trim() ?? '';
    console.log(`Filtering articles by tag: "${tagName}"`);

    await firstTag.click();

    // Assert: clicked tag becomes the active feed tab shown as "#<tagName>"
    await expect(
      feedPage.tagListTabs.nth(1),
      `❌ Active tag tab "#${tagName}" not visible after clicking the tag`
    ).toHaveText(`${tagName}`);

    // Assert: at least one article preview appears in the filtered feed
    await expect(
      feedPage.articlePreviews.first(),
      '❌ No article previews found under the filtered tag feed'
    ).toBeVisible();

    console.log(`✅ Step 4 — Articles filtered by tag: "${tagName}"`);
  });


  // ══════════════════════════════════════════════════════════════════════════
  // Step 5: Update User Settings
  // ══════════════════════════════════════════════════════════════════════════
  test('Step 5: Update User Settings', async ({ page }) => {
    const settingsPage = new SettingsPage(page);

    const updatedBio = `Automated QA tester bio — updated ${Date.now()}`;

    await settingsPage.clickSettings();
    await expect(page).toHaveURL(/.*\/settings/);
    await expect(
      settingsPage.heading,
      '❌ Settings page heading not visible'
    ).toBeVisible();

    await settingsPage.clearBio();
    await settingsPage.fillBio(updatedBio);
    await expect(settingsPage.bioField).toHaveValue(updatedBio);

    await settingsPage.submit();

    // Assert: redirected away from settings after saving
    await expect(page).not.toHaveURL(/.*\/settings/, { timeout: 10_000 });

    // Assert: updated bio visible on the redirected profile/home page
    await expect(
      page.getByText(updatedBio),
      '❌ Updated bio not visible after saving settings'
    ).toBeVisible();

    console.log(`✅ Step 5 — Bio updated: "${updatedBio}"`);
  });

});
