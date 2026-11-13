// Build static, readable portfolio pages from the same public data as the admin.
// Run on every deployment; a failed data read fails the build rather than
// publishing an empty portfolio or an inaccurate sitemap.
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const origin = 'https://ahmadajmal.vercel.app';
const database = 'https://firestore.googleapis.com/v1/projects/ahmad-ajmal-portfolio-v1/databases/(default)/documents';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plain = value => String(value ?? '').replace(/<(?:br\s*\/?|\/p|\/div|\/li|\/ul)>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity) => {
  if (entity[0] === '#') {
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }[entity.toLowerCase()];
}).trim();
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const decode = value => 'stringValue' in value ? value.stringValue : 'booleanValue' in value ? value.booleanValue : 'integerValue' in value ? Number(value.integerValue) : 'doubleValue' in value ? value.doubleValue : 'arrayValue' in value ? (value.arrayValue.values || []).map(decode) : 'mapValue' in value ? fields(value.mapValue.fields) : null;
const fields = values => Object.fromEntries(Object.entries(values || {}).map(([key, value]) => [key, decode(value)]));
async function get(resource) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${database}/${resource}`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Portfolio data returned ${response.status}`);
      return await response.json();
    } catch (error) { lastError = error; }
  }
  throw lastError;
}
const profile = fields((await get('portfolio/profile')).fields);
const projects = [];
let token;
do {
  const page = await get(`portfolio/projects/items?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
  projects.push(...(page.documents || []).map(doc => ({ ...fields(doc.fields), id: doc.name.split('/').pop() })));
  token = page.nextPageToken;
} while (token);
if (!projects.length || !profile.name) throw new Error('Incomplete portfolio data');
projects.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
for (const project of projects) {
  if (!/^[\w-]+$/.test(project.id)) throw new Error('Unsupported project ID');
}

await mkdir(out, { recursive: true });
for (const directory of ['assets', 'css', 'js']) await cp(path.join(root, directory), path.join(out, directory), { recursive: true });
await mkdir(path.join(out, 'projects'), { recursive: true });
await mkdir(path.join(out, 'assets/seo-projects'), { recursive: true });
async function publicImage(value, name) {
  const embedded = /^data:image\/(png|jpe?g|webp);base64,([\s\S]+)$/i.exec(value || '');
  if (embedded) {
    const extension = embedded[1].toLowerCase().replace('jpeg', 'jpg');
    const url = `/assets/seo-projects/${name}.${extension}`;
    await writeFile(path.join(out, url.slice(1)), Buffer.from(embedded[2], 'base64'));
    return url;
  }
  if (/^https:\/\//i.test(value || '')) return value;
  if (/^\/?assets\/[\w./-]+$/.test(value || '') && !value.includes('..')) return '/' + value.replace(/^\//, '');
  return '';
}
for (const project of projects) project.images = (await Promise.all((project.images || []).map((image, index) => publicImage(image, `${project.id}-${index}`)))).filter(Boolean);
const portrait = await publicImage(profile.photo, 'ahmad-ajmal') || '/assets/ahmad-ajmal-light.jpg';
const person = { '@type': 'Person', '@id': `${origin}/#person`, name: profile.name, alternateName: 'Ahmad Bin Ajmal', jobTitle: plain(profile.title), description: plain(profile.bio), url: origin + '/', image: portrait.startsWith('https://') ? portrait : origin + portrait, sameAs: ['https://www.linkedin.com/in/ahmad-bin-ajmal-74998543a/'], knowsAbout: ['Game Development', 'Unity', 'Mobile Games', 'Software Engineering', 'Web Development'] };
const website = { '@type': 'WebSite', '@id': `${origin}/#website`, name: 'Ahmad Ajmal | Game Developer', url: origin + '/', publisher: { '@id': person['@id'] } };
function metadata(title, description, pathname, image = portrait, type = 'website', graph = []) {
  const imageUrl = image.startsWith('https://') ? image : origin + image;
  return `<title>${escape(title)}</title>
  <meta name="description" content="${escape(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${origin}${pathname}">
  <meta property="og:site_name" content="Ahmad Ajmal">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escape(title)}">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:url" content="${origin}${pathname}">
  <meta property="og:image" content="${escape(imageUrl)}">
  <meta property="og:image:alt" content="${escape(title)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(title)}">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="${escape(imageUrl)}">
  <script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': [person, website, ...graph] })}</script>`;
}
const projectPath = id => `/projects/${encodeURIComponent(id)}.html`;
const listing = [...projects].sort((a, b) => Number(Boolean(b.isTopTier)) - Number(Boolean(a.isTopTier)));
const cards = listing.map(p => `<a href="${projectPath(p.id)}" class="project-card" data-id="${escape(p.id)}">${p.images[0] ? `<img class="project-cover" src="${escape(p.images[0])}" alt="${escape(p.title)}" loading="lazy">` : ''}<div class="project-info"><h3 class="project-title">${escape(p.title)}</h3><div class="project-subtitle">${escape(plain(p.subtitle))}</div></div></a>`).join('\n');
const pages = [
  ['index.html', '/', 'Ahmad Ajmal | Unity Game Developer & Software Engineer', 'Ahmad Ajmal (Ahmad Bin Ajmal) is a game developer and software engineer in Pakistan. Explore Unity, iOS and PC games, software, and interactive web projects.'],
  ['work.html', '/work.html', 'Game Development Portfolio | Ahmad Ajmal', 'Explore Ahmad Ajmal’s Unity, iOS and PC game projects, gameplay screenshots, App Store releases, and game development showreel.'],
  ['contact.html', '/contact.html', 'Contact Ahmad Ajmal | Game Developer & Software Engineer', 'Contact Ahmad Ajmal in Muzaffarabad, Pakistan for game development, software engineering and web projects. View achievements and certificates.'],
  ['cv.html', '/cv.html', 'Ahmad Bin Ajmal CV | Game Developer & Software Engineer', 'View and download Ahmad Bin Ajmal’s PDF CV, covering game development, software engineering, skills and experience.'],
  ['play.html', '/play.html', 'Interactive Mini Games | Ahmad Ajmal', 'Play interactive browser mini games on Ahmad Ajmal’s game development portfolio.'],
  ['bhai.html', '/bhai.html', 'Bhai Log Community | Ahmad Ajmal', 'Meet the Bhai Log community on Ahmad Ajmal’s portfolio.']
];
for (const [file, pathname, title, description] of pages) {
  let html = (await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n');
  const graph = [{ '@type': file === 'index.html' ? 'ProfilePage' : file === 'work.html' ? 'CollectionPage' : file === 'contact.html' ? 'ContactPage' : 'WebPage', '@id': origin + pathname, url: origin + pathname, name: title, description, isPartOf: { '@id': website['@id'] }, ...(file === 'index.html' ? { mainEntity: { '@id': person['@id'] } } : {}) }];
  html = html.replace(/<title>[\s\S]*?<\/title>/, metadata(title, description, pathname, portrait, file === 'index.html' ? 'profile' : 'website', graph));
  html = html.replaceAll('href="index.html"', 'href="/"');
  // Keep useful HTML visible even if a visitor has disabled JavaScript.
  html = html.replace('</head>', '<noscript><style>#preloader,.projects-loader{display:none!important}.reveal{opacity:1!important;transform:none!important}</style></noscript>\n</head>');
  if (file === 'index.html') {
    for (const [id, text] of [['heroName', profile.name], ['heroTitle', profile.title], ['heroBio', profile.bio]]) html = html.replace(new RegExp(`(id="${id}">)[\\s\\S]*?(</[^>]+>)`), (_, open, close) => open + escape(text) + close);
    html = html.replace(/(<img\s+)src="[^"]*"(\s+alt="Profile")/, `$1src="${escape(portrait)}"$2`).replace('alt="Profile"', 'alt="Ahmad Ajmal, game developer and software engineer"');
  }
  if (file === 'work.html') html = html.replace(/(<div class="projects-grid" id="projectsGrid"[^>]*>)[\s\S]*?(\n        <\/div>\n      <\/section>)/, `$1\n${cards}$2`);
  if (file === 'index.html' || file === 'work.html') html = html.replace('<script src="js/common.js">', '<script src="js/project-pages.js"></script>\n  <script src="js/common.js">');
  await writeFile(path.join(out, file), html);
}
let admin = await readFile(path.join(root, 'admin.html'), 'utf8');
admin = admin.replace('</head>', '<meta name="robots" content="noindex, nofollow">\n</head>');
await writeFile(path.join(out, 'admin.html'), admin);
await writeFile(path.join(out, 'js/project-pages.js'), `window.PORTFOLIO_PROJECT_PAGES = ${json(projects.map(p => p.id))};\nwindow.PORTFOLIO_PROJECTS = ${json(projects)};\n`);

for (const p of projects) {
  const title = `${p.title.trim()} | Ahmad Ajmal’s Game Portfolio`;
  const description = `${p.title.trim()}: ${plain(p.subtitle) || 'A game development project by Ahmad Ajmal.'}`.replace(/\s+/g, ' ').slice(0, 180);
  const url = projectPath(p.id);
  const appStore = /href=["'](https:\/\/apps\.apple\.com\/[^"']+)["']/i.exec(p.detail || '')?.[1];
  const paragraphs = plain(p.detail).split(/\n+/).filter(Boolean).map(text => `<p>${escape(text)}</p>`).join('\n');
  const graph = [{ '@type': 'CreativeWork', '@id': origin + url + '#project', name: p.title, description: plain(p.detail), url: origin + url, image: p.images.map(image => image.startsWith('https://') ? image : origin + image), isPartOf: { '@id': website['@id'] } }, { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' }, { '@type': 'ListItem', position: 2, name: 'Work', item: origin + '/work.html' }, { '@type': 'ListItem', position: 3, name: p.title, item: origin + url }] }];
  await writeFile(path.join(out, url.slice(1)), `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
${metadata(title, description, url, p.images[0] || portrait, 'website', graph)}
<link rel="icon" href="/assets/favicon.png"><script src="/js/theme-init.js"></script><link rel="stylesheet" href="/css/style.css"></head>
<body class="dark"><nav class="nav-bar" aria-label="Main navigation"><div class="nav-left"><a href="/" class="nav-link" aria-label="Ahmad Ajmal home">AA</a></div><div class="nav-center"><a class="nav-link" href="/">Home</a><a class="nav-link active" href="/work.html">Work</a><a class="nav-link" href="/contact.html">Contact</a></div><div class="nav-right"><button class="btn-theme-toggle" id="themeToggle" aria-label="Switch theme"><span class="theme-icon">☀️</span></button></div></nav>
<main class="page-wrapper"><article class="overlay-content section"><a class="section-link" href="/work.html">← All projects</a><h1 class="section-title">${escape(p.title)}</h1><p class="section-subtitle">${escape(plain(p.subtitle))}</p>
${p.images[0] ? `<div class="overlay-hero"><img class="overlay-hero-img" src="${escape(p.images[0])}" alt="${escape(p.title)} cover" fetchpriority="high"></div>` : ''}
<div class="overlay-detail">${paragraphs}</div>${appStore ? `<p><a class="btn-primary" href="${escape(appStore)}" target="_blank" rel="noopener noreferrer">View on the App Store ↗</a></p>` : ''}
<div class="overlay-gallery">${p.images.slice(1).map((image, i) => `<img class="overlay-gallery-img" src="${escape(image)}" alt="${escape(p.title)} gameplay screenshot ${i + 1}" loading="lazy" decoding="async">`).join('\n')}</div>
<p><a class="btn-secondary" href="/contact.html">Discuss a game project with Ahmad</a></p></article></main>
<script src="/js/common.js"></script></body></html>`);
}
const urls = [...pages.map(p => p[1]), ...projects.map(p => projectPath(p.id))];
await writeFile(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `<url><loc>${escape(origin + url)}</loc></url>`).join('\n')}\n</urlset>\n`);
await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Built ${pages.length} public pages, ${projects.length} project pages, sitemap and crawlable project links.`);
