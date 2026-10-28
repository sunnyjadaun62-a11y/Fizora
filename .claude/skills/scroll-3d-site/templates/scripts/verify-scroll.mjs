import puppeteer from "puppeteer-core";
const [,, out, w, h] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await b.newPage();
await page.setViewport({ width: +w, height: +h, isMobile: +w < 600, hasTouch: +w < 600 });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://localhost:3011/", { waitUntil: "networkidle0", timeout: 90000 });
await new Promise((r) => setTimeout(r, 7000));
const targets = [["building", 0.45], ["emergency", 0.4], ["departments", 0.5], ["technology", 0.4], ["doctors", 0.45], ["night", 0.5], ["contact", 0.05]];
for (const [id, f] of targets) {
  await page.evaluate((id, f) => {
    const el = document.getElementById(id);
    const y = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * f;
    window.scrollTo(0, y);
  }, id, f);
  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({ path: `${out}/${w}_${id}.png` });
}
console.log(errs.slice(0, 10).join("\n") || "no errors");
await b.close();
