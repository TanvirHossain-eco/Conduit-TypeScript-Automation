// pages/ArticlePage.ts
import { Page, Locator } from '@playwright/test';

export class ArticlePage {
  readonly page: Page;

  readonly authorLink: Locator;
  readonly editArticleLink: Locator;
  readonly deleteArticleButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.authorLink           = page.locator('a.author').first();
    this.editArticleLink      = page.getByRole('link', { name: ' Edit Article' }).first();
    this.deleteArticleButton  = page.getByRole('button', { name: ' Delete Article' }).first();
  }

  async goto(baseUrl: string, slug: string): Promise<void> {
    await this.page.goto(`${baseUrl}/article/${slug}`);
  }

  heading(title: string): Locator {
    return this.page.getByRole('heading', { name: title });
  }

  async clickEditArticle(): Promise<void> {
    await this.editArticleLink.click();
  }

  async clickDeleteArticle(): Promise<void> {
    await this.deleteArticleButton.click();
  }
}
