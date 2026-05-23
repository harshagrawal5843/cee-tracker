const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const host = "http://localhost:3005";
  const paths = [
    { path: "/", name: "home" },
    { path: "/study-timer", name: "study-timer" },
    { path: "/challenge-history", name: "challenge-history" },
    { path: "/subject/Physics", name: "subject-Physics" },
  ];

  for (const p of paths) {
    const url = host + p.path;
    try {
      console.log("Visiting", url);
      await page.goto(url, { waitUntil: "networkidle" });
    } catch (e) {
      console.warn("Goto failed, trying simple navigate", url, e.message);
      await page.goto(url).catch(() => {});
    }

    // Ensure dark theme and capture
    await page.evaluate(() => {
      localStorage.setItem("cee-tracker-theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(400);
    const darkPath = `public/screenshots/dark-${p.name}.png`;
    await page.screenshot({ path: darkPath, fullPage: true });
    console.log("Saved", darkPath);

    // Ensure light theme and capture
    await page.evaluate(() => {
      localStorage.setItem("cee-tracker-theme", "light");
      document.documentElement.classList.remove("dark");
    });
    await page.reload({ waitUntil: "networkidle" }).catch(() => {});
    await page.waitForTimeout(400);
    const lightPath = `public/screenshots/light-${p.name}.png`;
    await page.screenshot({ path: lightPath, fullPage: true });
    console.log("Saved", lightPath);

    // restore dark (so next iteration starts dark)
    await page.evaluate(() => {
      localStorage.setItem("cee-tracker-theme", "dark");
      document.documentElement.classList.add("dark");
    });
  }

  await browser.close();
  console.log("Done capturing screenshots");
})();
