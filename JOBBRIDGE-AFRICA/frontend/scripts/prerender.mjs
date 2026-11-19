import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const dist = resolve("dist");
const { renderRoute } = await import(pathToFileURL(resolve(dist, "server/entry-server.js")).href);
const template = await readFile(resolve(dist, "index.html"), "utf8");
const routes = [
  ["/", "JobBridge Africa | Find Jobs Across Africa", "Discover job opportunities across Africa and worldwide with JobBridge Africa."],
  ["/jobs", "Find Jobs Across Africa | JobBridge Africa", "Search jobs by keyword, location, work arrangement, job type, and category."],
  ["/sdg-impact", "Our SDG 8 Impact | JobBridge Africa", "Learn how JobBridge Africa supports access to decent work and economic opportunity."],
  ["/ai-cv-tool", "CV Refinisher | JobBridge Africa", "Review your CV against a job description with a privacy-conscious keyword tool."],
  ["/royal-merchant", "Royal Merchant Cooperative Study Support | JobBridge Africa", "Explore Royal Merchant MPCS cooperative membership and training-support information."],
  ["/employers", "Hire African Talent | JobBridge Africa", "Post opportunities and connect with job seekers across African markets."],
  ["/about", "About JobBridge Africa", "Our story, team, partners, and commitment to decent work across Africa."],
  ["/contact", "Contact JobBridge Africa", "Get support from JobBridge Africa by email, phone, or contact form."],
  ["/pricing", "Pricing | JobBridge Africa", "JobBridge Africa launch pricing, included features, and employer fee information."],
  ["/privacy", "Privacy Policy | JobBridge Africa", "How JobBridge Africa processes, stores, and protects personal information and CV data."],
  ["/terms", "Terms of Use | JobBridge Africa", "Terms for job seekers, employers, and users of JobBridge Africa tools."],
  ["/cookies", "Cookie Notice | JobBridge Africa", "Learn about cookies and manage your optional cookie preferences."],
  ["/faq", "Frequently Asked Questions | JobBridge Africa", "Answers for job seekers and employers using JobBridge Africa."],
];
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

for (const [path, title, description] of routes) {
  const canonical = `https://jobbridgeafrica.com${path}`;
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, "");
  html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, "");
  html = html.replace(/<meta\s+property=["']og:(?:title|description|url)["'][^>]*>/gi, "");
  html = html.replace(/<meta\s+name=["']twitter:(?:title|description)["'][^>]*>/gi, "");
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, "");
  const headMetadata = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta name="robots" content="index, follow">',
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
  ].join("\n    ");
  html = html.replace("</head>", `    ${headMetadata}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${renderRoute(path)}</div>`);

  const outputPath = path === "/"
    ? resolve(dist, "index.html")
    : resolve(dist, path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
}
