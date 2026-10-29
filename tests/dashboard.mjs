import { chromium, expect } from "@playwright/test";
import { preview } from "vite";
import { mkdir, readFile } from "node:fs/promises";

const basePath = process.env.DASHBOARD_BASE_PATH || "/";
const baseUrl = `http://127.0.0.1:4173${basePath}`;
const server = await preview({
  base: basePath,
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
let checks = 0;
function passed(name) {
  checks++;
  console.log(`PASS ${name}`);
}
try {
  await mkdir("test-results", { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await expect(
    page.getByRole("heading", { name: "Quality overview", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".metric-value").nth(1)).toHaveText("1,284");
  await expect(page.locator(".inspection-table tbody tr")).toHaveCount(5);
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  const missingAssets = [];
  page.on("response", (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400)
      missingAssets.push(response.url());
  });
  const assets = await page
    .locator('script[src], link[rel="stylesheet"], link[rel="icon"]')
    .evaluateAll((elements) => elements.map((el) => el.src || el.href));
  for (const asset of assets) {
    expect(asset.startsWith(baseUrl)).toBe(true);
    const response = await page.request.get(asset);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).not.toContain("text/html");
  }
  passed("Dashboard and production assets load at the deployment path");

  await page.getByLabel("Filter by location").selectOption("North facility");
  await expect(page.locator(".metric-value").nth(1)).toHaveText("428");
  await expect(page.locator(".inspection-table tbody")).toContainText(
    "North facility",
  );
  await page.getByLabel("Date range").selectOption("week");
  const weeklyCount = Number(
    (await page.locator(".metric-value").nth(1).innerText()).replaceAll(
      ",",
      "",
    ),
  );
  expect(weeklyCount).toBeGreaterThan(0);
  expect(weeklyCount).toBeLessThan(428);
  await page.getByLabel("Filter by location").selectOption("All locations");
  await page.getByLabel("Date range").selectOption("month");
  passed("Location and date filters recalculate inspection metrics");

  const search = page.getByRole("textbox", { name: "Search inspections" });
  await search.pressSequentially("assembly", { delay: 40 });
  await expect(search).toHaveValue("assembly");
  await expect(page.locator(".inspection-table tbody tr")).toHaveCount(5);
  await expect(
    page.locator(".inspection-table tbody tr").first(),
  ).toContainText("Assembly process review");
  await search.fill("a finding that does not exist");
  await expect(
    page.getByRole("heading", { name: "No inspections found" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(search).toHaveValue("");
  passed("Search preserves focus while typing and handles empty results");

  const firstId = await page
    .locator(".inspection-table tbody tr")
    .first()
    .innerText();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".table-pagination")).toContainText("Page 2 of");
  expect(
    await page.locator(".inspection-table tbody tr").first().innerText(),
  ).not.toBe(firstId);
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await page.getByRole("button", { name: "Passed", exact: true }).click();
  await expect(
    page.locator(".inspection-table tbody tr .status-badge").first(),
  ).toHaveText("Passed");
  expect(
    await page
      .locator(".inspection-table tbody .status-badge")
      .allTextContents(),
  ).toEqual(Array(5).fill("Passed"));
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page
    .getByRole("button", { name: /^Process control audit/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Inspection notes");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  passed("Pagination, status filtering, and inspection details work");

  await page
    .getByRole("button", { name: "New inspection", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Inspection name").fill("End-to-end quality check");
  await form
    .getByLabel("Category", { exact: true })
    .selectOption("Process compliance");
  await form
    .getByLabel("Location", { exact: true })
    .selectOption("East facility");
  await form.getByLabel("Notes").fill("Verify the finished production batch.");
  await form
    .getByRole("button", { name: "Create inspection", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Scheduled");
  await page.getByLabel("Quality score (0–100)").fill("96");
  await page
    .getByRole("button", { name: "Complete inspection", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".status-badge")).toHaveText(
    "Passed",
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Search inspections" })
    .fill("End-to-end quality check");
  await expect(page.locator(".inspection-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".inspection-table tbody tr")).toContainText("96%");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("textbox", { name: "Search inspections" })
    .fill("End-to-end quality check");
  await expect(page.locator(".inspection-table tbody tr")).toContainText("96%");
  passed("An inspection can be created, completed, and restored after reload");

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export report", exact: true })
    .click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain("End-to-end quality check");
  expect(csv).toContain('"96","Passed"');
  expect(csv.split("\r\n")).toHaveLength(2);
  passed("CSV export contains exactly the filtered inspection data");

  await page
    .getByRole("navigation")
    .getByRole("button", { name: /^Issues/ })
    .click();
  await page.getByRole("button", { name: "Critical", exact: true }).click();
  await expect(page.locator(".issue-card")).toHaveCount(6);
  await page
    .locator(".issue-card")
    .filter({ has: page.getByText("Open", { exact: true }) })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("In progress");
  await page
    .getByRole("button", { name: "Mark as resolved", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Resolved");
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  await expect(page.locator(".metric-value").nth(3)).toHaveText("23");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator(".metric-value").nth(3)).toHaveText("23");
  passed("Issue investigation and resolution update metrics and persist");

  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Corrective actions", exact: true })
    .click();
  await expect(page.locator(".action-next-step").first()).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Reports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Location scorecard", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".location-report tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: "Pass rate", exact: true }).click();
  await expect(page.locator(".trend-chart svg")).toHaveAttribute(
    "aria-label",
    /^Pass rate trend/,
  );
  passed(
    "Corrective actions and report scorecards render with an interactive trend chart",
  );

  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Team members", exact: true })
    .click();
  await page.getByRole("button", { name: "Add member", exact: true }).click();
  await page.getByLabel("Full name").fill("Taylor Smith");
  await page.getByLabel("Email address").fill("taylor@example.com");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add member", exact: true })
    .click();
  await expect(page.locator(".members-table tbody tr")).toHaveCount(6);
  await expect(page.locator(".members-table tbody")).toContainText(
    "Taylor Smith",
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await page.getByLabel("Workspace name").fill("Acme Quality Lab");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.locator(".workspace-picker")).toContainText(
    "Acme Quality Lab",
  );
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByLabel("Workspace name")).toHaveValue(
    "Acme Quality Lab",
  );
  passed("Team additions and workspace settings save locally");

  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await expect(page.locator(".notification-popover")).toBeVisible();
  await page.getByRole("button", { name: "Mark read" }).click();
  await expect(page.getByText("You're all caught up.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".notification-popover")).toHaveCount(0);
  await page.getByRole("button", { name: "Help center", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Make every inspection count",
  );
  await page.keyboard.press("Tab");
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  passed("Notifications, help, and modal keyboard interaction work");

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const mobilePage = await mobile.newPage();
  mobilePage.on("pageerror", (error) => errors.push(error.message));
  await mobilePage.goto(baseUrl, { waitUntil: "networkidle" });
  expect(
    await mobilePage.locator("body").evaluate((el) => el.scrollWidth),
  ).toBeLessThanOrEqual(390);
  expect((await mobilePage.locator(".sidebar").boundingBox()).x).toBeLessThan(
    0,
  );
  await mobilePage.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await mobilePage
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(mobilePage.getByRole("navigation")).toBeInViewport();
  await mobilePage
    .getByRole("navigation")
    .getByRole("button", { name: "Inspections", exact: true })
    .click();
  await expect(
    mobilePage.getByRole("heading", { name: "Inspections", exact: true }),
  ).toBeVisible();
  await mobilePage
    .getByRole("button", { name: "New inspection", exact: true })
    .click();
  await expect(mobilePage.getByRole("dialog")).toBeInViewport();
  expect(
    await mobilePage.locator("body").evaluate((el) => el.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await mobilePage.getByRole("button", { name: "Close dialog" }).click();
  await mobile.close();
  passed("Mobile dashboard, navigation, and form fit the viewport");

  expect(errors).toEqual([]);
  expect(missingAssets).toEqual([]);
  passed("No browser runtime errors");
  console.log(`\n${checks} browser checks passed.`);
} finally {
  await browser.close();
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
