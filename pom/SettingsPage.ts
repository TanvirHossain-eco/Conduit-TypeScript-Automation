// pages/SettingsPage.ts
import { Page, Locator } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;

  readonly settingsLink: Locator;
  readonly heading: Locator;
  readonly bioField: Locator;
  readonly updateButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.settingsLink = page.getByRole('link', { name: '  Settings' });
    this.heading        = page.getByRole('heading', { name: 'Your Settings' });
    this.bioField         = page.getByRole('textbox', { name: 'Short bio about you' });
    this.updateButton      = page.getByRole('button', { name: 'Update Settings' });
  }

  async clickSettings(): Promise<void> {
    await this.settingsLink.click();
  }

  async clearBio(): Promise<void> {
    await this.bioField.clear();
  }

  async fillBio(bio: string): Promise<void> {
    await this.bioField.fill(bio);
  }

  async submit(): Promise<void> {
    await this.updateButton.click();
  }
}
