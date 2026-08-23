// pages/FeedPage.ts
import { Page, Locator } from '@playwright/test';
import { ARTICLE_TITLE_REGEX } from '../config/constants';

export class FeedPage {
  readonly page: Page;

  readonly articlePreviews: Locator;
  readonly tagListSidebar: Locator;
  readonly tagListTabs: Locator;

  constructor(page: Page) {
    this.page = page;

    this.articlePreviews = page.locator('.article-preview');
    this.tagListSidebar   = page.locator('div.tag-list');
    this.tagListTabs        = page.locator('ul.tag-list').locator('li');
  }

  async goto(baseUrl: string): Promise<void> {
    await this.page.goto(baseUrl);
  }

  firstTag(): Locator {
    return this.tagListSidebar.locator('a').nth(0);
  }

  /**
   * Scans the Global Feed for the latest "Automation Testing <N>" article
   * by authorUsername. Returns { title, slug } or null if none found.
   * Reads only live UI — used solely as a cross-worker/cross-run signal
   * (see beforeEach in the spec), never called when we already trust an
   * in-memory value.
   */
  async findLatestAutomationTestingArticle(
    baseUrl: string,
    authorUsername: string
  ): Promise<{ title: string; slug: string } | null> {
    await this.goto(baseUrl);

    const count = await this.articlePreviews.count();
    let best: { title: string; slug: string | undefined; number: number } | null = null;

    for (let i = 0; i < count; i++) {
      const preview   = this.articlePreviews.nth(i);
      const titleText = (await preview.locator('h1').textContent())?.trim() ?? '';
      const match     = titleText.match(ARTICLE_TITLE_REGEX);
      if (!match) continue;

      const authorText = (await preview.locator('a.author').first().textContent())?.trim() ?? '';
      if (authorText !== authorUsername) continue;

      const number = parseInt(match[1], 10);
      if (!best || number > best.number) {
        const href = await preview.locator('a.preview-link').getAttribute('href');
        const slug = href ? href.split('/article/').pop() : undefined;
        best = { title: titleText, slug, number };
      }
    }

    return best && best.slug ? { title: best.title, slug: best.slug } : null;
  }
}
