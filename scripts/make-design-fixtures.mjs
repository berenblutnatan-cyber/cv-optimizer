// Builds the PDF fixtures for lib/import/pdfDesign.test.ts: five real PDFs in
// five designs, printed by Chrome the way most CV tools make them.
// Run: node scripts/make-design-fixtures.mjs   (needs a local Chrome)

import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "test/fixtures/pdf");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const body = (h) => `
<h2>${h("Experience")}</h2>
<div class="r">Senior Data Analyst, PayLeaf</div><div class="m">Tel Aviv · Mar 2022 – Present</div>
<ul><li>Built the experimentation platform used by 9 product teams, running 140 A/B tests a year</li>
<li>Cut weekly reporting time from 2 days to 3 hours with dbt and Airflow pipelines</li>
<li>Found a checkout drop-off that recovered 4.2% of monthly revenue</li></ul>
<div class="r">Data Analyst, ShopNow</div><div class="m">Haifa · Jun 2019 – Feb 2022</div>
<ul><li>Owned marketing attribution for a 12M ILS annual budget</li><li>Responsible for weekly KPI dashboards in Tableau</li></ul>
<h2>${h("Education")}</h2><div class="r">B.Sc. Industrial Engineering, Technion</div><div class="m">2015 – 2019</div>
<h2>${h("Volunteering")}</h2><div>Mentor, Baot women in data community (2020 – present)</div>`;

const side = `
<h3>CONTACT</h3><div>noa.ben-david@example.com</div><div>+972 54 555 1212</div><div>Haifa, Israel</div>
<h3>SKILLS</h3><div>Python</div><div>SQL</div><div>Tableau</div><div>A/B testing</div><div>dbt</div><div>Airflow</div>
<h3>LANGUAGES</h3><div>Hebrew (native)</div><div>English (fluent)</div>`;

const head = `<h1>Noa Ben-David</h1><div class="t">Senior Data Analyst</div>
<p>Data analyst with 6 years turning product and marketing data into decisions at B2C and fintech companies.</p>`;

const base = `@page{size:A4;margin:0} body{margin:0} ul{padding-left:18px;margin:6px 0 12px} li{margin:3px 0}
.r{font-weight:bold} .m{color:#666;font-size:11.5px} img.photo{display:block;width:120px;height:120px;border-radius:50%;margin:0 auto 18px}`;

// A drawn "headshot": a raster image in the PDF, like a real photo.
const photoScript = `<script>
  const c = document.createElement('canvas'); c.width = c.height = 240; const x = c.getContext('2d');
  const g = x.createLinearGradient(0,0,0,240); g.addColorStop(0,'#c9d6df'); g.addColorStop(1,'#52616b'); x.fillStyle = g; x.fillRect(0,0,240,240);
  x.fillStyle = '#e0b89a'; x.beginPath(); x.arc(120,95,48,0,7); x.fill(); x.beginPath(); x.ellipse(120,230,90,70,0,0,7); x.fill();
  for (const img of document.querySelectorAll('img.photo')) img.src = c.toDataURL('image/jpeg', 0.9);
</script>`;

export const FIXTURES = {
  "teal-sidebar-photo": `<style>${base} body{font-family:Georgia,serif;color:#222}
.wrap{display:grid;grid-template-columns:34% 66%;min-height:297mm}
aside{background:#0f3d3e;color:#fff;padding:28px 22px;font-family:Helvetica,Arial,sans-serif;font-size:12px}
aside h3{color:#7fd1c7;font-size:12px;letter-spacing:.12em;margin:22px 0 8px}
main{padding:30px;font-size:12.5px} h1{font-size:30px;margin:0;color:#0f3d3e} .t{color:#0f9b8e;font-size:15px;margin:4px 0 18px}
main h2{font-size:13px;letter-spacing:.14em;color:#0f9b8e;border-bottom:1px solid #cfe9e5;padding-bottom:4px;margin:18px 0 8px;text-transform:uppercase}
</style><div class="wrap"><aside><img class="photo">${side}</aside><main>${head}${body((s) => s)}</main></div>${photoScript}`,

  "classic-serif": `<style>${base} body{font-family:"Times New Roman",Times,serif;color:#111;padding:48px 56px;font-size:12.5px}
h1{text-align:center;font-size:28px;margin:0} .t{text-align:center;margin:4px 0 4px} p{margin:10px 0}
h2{font-size:13px;letter-spacing:.1em;border-bottom:1px solid #111;margin:18px 0 8px;text-transform:uppercase}
</style>${head}${body((s) => s)}<h2>Skills</h2><div>Python, SQL, Tableau, A/B testing, dbt, Airflow</div>`,

  "navy-band": `<style>${base} body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:12.5px}
header{background:#1e3a8a;color:#fff;padding:36px 48px} header h1{margin:0;font-size:30px} header .t{font-size:15px;opacity:.9;margin-top:4px} header p{margin:10px 0 0}
main{padding:12px 48px} h2{color:#1e3a8a;font-size:14px;margin:18px 0 8px;border-bottom:2px solid #1e3a8a}
</style><header>${head}</header><main>${body((s) => s)}<h2>Skills</h2><div>Python, SQL, Tableau, A/B testing</div></main>`,

  "rose-right-sidebar": `<style>${base} body{font-family:Helvetica,Arial,sans-serif;color:#222;font-size:12.5px}
.wrap{display:grid;grid-template-columns:68% 32%;min-height:297mm}
main{padding:36px} aside{background:#fde7ea;padding:36px 22px;font-size:12px} aside h3{color:#be123c;font-size:12px;margin:22px 0 8px}
h1{margin:0;font-size:30px;color:#be123c} .t{font-size:15px;margin:4px 0 14px} h2{color:#be123c;font-size:14px;margin:18px 0 8px}
</style><div class="wrap"><main>${head}${body((s) => s)}</main><aside>${side}</aside></div>`,

  "two-column-plain": `<style>${base} body{font-family:Helvetica,Arial,sans-serif;color:#222;font-size:12px;padding:40px}
h1{margin:0;font-size:28px} .t{color:#2563eb;font-size:15px;margin:4px 0 12px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px} h2,h3{color:#2563eb;font-size:13px;margin:16px 0 6px}
</style>${head}<div class="cols"><div>${body((s) => s)}</div><div>${side}<h3>CERTIFICATIONS</h3><div>Google Data Analytics, 2021</div><div>Tableau Desktop Specialist, 2020</div><h3>INTERESTS</h3><div>Trail running, chess, open data</div><div>Teaching SQL to high-school students</div></div></div>`,
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
mkdirSync(OUT, { recursive: true });
for (const [name, html] of Object.entries(FIXTURES)) {
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`, { waitUntil: "load" });
  writeFileSync(join(OUT, `${name}.pdf`), await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  await page.close();
  console.log("wrote", name);
}
await browser.close();
