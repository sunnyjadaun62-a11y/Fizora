import puppeteer from "puppeteer-core";
const [,, out, ...ps] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await b.newPage();
await page.setViewport({ width: 1440, height: 860 });
const errs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text()); });
page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message));
for (const p of ps) {
  const [prog, extra] = p.split(":");
  await page.goto(`http://localhost:3011/?p=${prog}${extra ? "&" + extra : ""}`, { waitUntil: "networkidle0", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 6000));
  await page.screenshot({ path: `${out}/p${prog}${extra ? "_" + extra : ""}.png` });
}
console.log(errs.slice(0, 15).join("\n"));
await b.close();
