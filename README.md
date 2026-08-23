# Conduit — Playwright Automation Project
=============================================================================
# Prerequisites:
==============
- IDE (VS Code)
- Git Bash Installation
- Node Js Installation
- After installation of Node JS open the command prompt 
- check node & npm version
- To check Node version = node -v
- To check NPM version = npm -v

# Setup Instructions (Local):
===========================
1. Clone the repository
- Open a terminal from IDE (or Git Bash)
- Navigate to the folder where you want to clone the project: cd /path/to/your/folder
- git clone (Provide URL)
- cd <REPOSITORY_NAME> like: cd Bondaracademy-TypeScript (You can also rename the folder later)
- Fill out the .env.example accordingly and rename it as .env 

2. Install dependencies
- npm install

3. Install Playwright browsers
- npx playwright install --with-deps

4. Run all tests
- npx playwright test

5. Run a specific task:
# Test: 
- npx playwright test tests/(testname).spec.js

6. Run the specific test in headed mode
- npx playwright test tests/(testname).spec.js --headed

7. Run the specific test in headed & debug mode
- npx playwright test tests/(testname).spec.js --headed --debug

8. View HTML report
- npx playwright show-report

In future, Allure report can be added for the better detail views. 

7. Test Data and Notes
=====================
- Test accounts are given including email address (see `.env.example`).

8. CI/CD Integration
Workflow file: .github/workflows/playwright.yml
CI/CD status badge is included at the top.

9. Verification
- For email verification updated time is used which would +5 mins from the system time
- Between 2 scenarios run, some texts are modified to verify email along with updated time

10. Project Structure and Key Design Decisions
=============================================
## Basic Structure

```
conduit-pom-project/
├── .env.example        ← copy to .env and fill in real values
├── types.ts             ← shared interfaces (ArticleRef, ConduitArticle, ConduitUser)
├── config/
│   ├── env.ts            ← loads & validates .env
│   └── constants.ts       ← ERROR_MESSAGES_LOCATOR, ARTICLE_TITLE_REGEX
├── utils/
│   └── titleHelper.ts     ← getUniqueTitle()
├── api/
│   └── conduitApi.ts      ← loginViaApi, createArticleViaApi, editArticleViaApi
├── pom/
│   ├── LoginPage.ts
│   ├── ArticleEditorPage.ts
│   ├── ArticlePage.ts
│   ├── FeedPage.ts
│   └── SettingsPage.ts
└── tests/
    └── conduit.spec.ts    ← Steps 1–5, orchestrating the page objects
```

## Notes

- Every wait, retry loop (`MAX_ATTEMPTS`, the `waitFor(...).catch(() => false)`
  duplicate-title check), `test.skip` guard, and assertion message from the
  original single-file spec is preserved exactly — this refactor only moves
  locators/actions into typed page-object classes and pulls config into
  `.env`. No timing or logic was changed.
- `currentArticle.title` / `.slug` are typed as optional (`ArticleRef`) since
  they start unset. Where the code narrows them to definite strings (e.g.
  right after `if (currentArticle.title && currentArticle.slug)`, once an
  `await` follows), a small local `const { title, slug } = currentArticle as
  { title: string; slug: string }` capture is used — TypeScript widens
  property-narrowing back to `string | undefined` across `await` boundaries
  for mutable outer variables, so this cast is required for the file to
  type-check under `strict: true`. It doesn't change behavior.
