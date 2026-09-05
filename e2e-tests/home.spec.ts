import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Tailspin Toys - Crowdfunding your new favorite game!');
  });

  test('should display the main heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome to Tailspin Toys', exact: true })).toBeVisible();
  });

  test('should display the site branding in header', async ({ page }) => {
    await expect(page.getByText('Tailspin Toys').first()).toBeVisible();
  });

  test('should display the welcome message', async ({ page }) => {
    await expect(page.getByText('Find your next game! And maybe even back one! Explore our collection!')).toBeVisible();
  });

  test('should filter games by multiple categories and a publisher', async ({ page }) => {
    await test.step('Apply the selected filter combination', async () => {
      const categoryFilter = page.getByTestId('category-filter');
      await categoryFilter.selectOption([{ label: 'Strategy' }, { label: 'Puzzle' }]);

      const publisherFilter = page.getByTestId('publisher-filter');
      await publisherFilter.selectOption({ label: 'CodeForge Studios' });

      await page.getByTestId('apply-filters').click();
    });

    await test.step('Verify the filtered list matches the selected combination', async () => {
      const visibleCards = page.locator('[data-testid="game-card"]:visible');
      await expect(visibleCards).toHaveCount(2);
      await expect(page.getByRole('link', { name: /DevOps Dominion/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Code Puzzle Chronicles/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Pipeline Conquest/i })).not.toBeVisible();
      await expect(page.getByText('No games match your selected filters.')).not.toBeVisible();
    });
  });
});
