// pages/ArticleEditorPage.ts
import { Page, Locator } from '@playwright/test';
import { ERROR_MESSAGES_LOCATOR } from '../config/constants';

export class ArticleEditorPage {
  readonly page: Page;

  readonly newArticleLink: Locator;
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly tagsInput: Locator;
  readonly publishButton: Locator;
  readonly errorMessages: Locator;

  constructor(page: Page) {
    this.page = page;

    this.newArticleLink   = page.getByRole('link', { name: '  New Article' });
    this.titleInput        = page.getByRole('textbox', { name: 'Article Title' });
    this.descriptionInput  = page.getByRole('textbox', { name: "What's this article about?" });
    this.bodyInput          = page.getByRole('textbox', { name: 'Write your article (in' });
    this.tagsInput           = page.getByRole('textbox', { name: 'Enter tags' });
    this.publishButton       = page.getByRole('button', { name: 'Publish Article' });
    this.errorMessages       = page.locator(ERROR_MESSAGES_LOCATOR);
  }

  async gotoEditor(baseUrl: string, slug: string): Promise<void> {
    await this.page.goto(`${baseUrl}/editor/${slug}`);
  }

  async clickNewArticle(): Promise<void> {
    await this.newArticleLink.click();
  }

  async fillTitle(title: string): Promise<void> {
    await this.titleInput.fill(title);
  }

  async fillDescription(description: string): Promise<void> {
    await this.descriptionInput.fill(description);
  }

  async fillBody(body: string): Promise<void> {
    await this.bodyInput.fill(body);
  }

  async fillTags(tags: string): Promise<void> {
    await this.tagsInput.fill(tags);
    await this.tagsInput.press('Enter');
  }

  async clickPublish(): Promise<void> {
    await this.publishButton.click();
  }

  /**
   * Non-blocking check for the "title must be unique" (or any other) editor
   * validation error. Unlike a hard toBeVisible() assertion, this resolves
   * false after `timeout` instead of hanging/failing when no error appears
   * — the common, successful case.
   */
  async hasDuplicateTitleError(timeout: number = 5_000): Promise<boolean> {
    return this.errorMessages
      .first()
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
  }

  async getErrorText(): Promise<string> {
    return (await this.errorMessages.allTextContents()).join(', ');
  }
}
