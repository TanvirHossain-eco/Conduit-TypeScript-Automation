// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';
import { ERROR_MESSAGES_LOCATOR } from '../config/constants';

export class LoginPage {
  readonly page: Page;

  readonly signInLink: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessages: Locator;
  readonly yourFeedText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.signInLink    = page.getByRole('link', { name: 'Sign in' });
    this.emailInput    = page.getByRole('textbox', { name: 'Email' });
    this.passwordInput = page.getByRole('textbox', { name: 'Password' });
    this.signInButton  = page.getByRole('button', { name: 'Sign in' });
    this.errorMessages = page.locator(ERROR_MESSAGES_LOCATOR);
    this.yourFeedText  = page.getByText('Your Feed');
  }

  async goto(baseUrl: string): Promise<void> {
    await this.page.goto(baseUrl);
  }

  async clickSignIn(): Promise<void> {
    await this.signInLink.click();
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.signInButton.click();
  }
}
