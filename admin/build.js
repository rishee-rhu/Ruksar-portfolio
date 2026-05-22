const fs = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────────

function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...val] = line.split(':');
    if (key) meta[key.trim()] = val.join(':').trim().replace(/^["']|["']$/g, '');
  });
  return { meta, body: match[2] };
}

function markdownToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => /^<[hul]/.test(line) ? line : `<p>${line}</p>`)
    .join('\n');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function slugFromFilename(filename) {
  return filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
}

// ── post template ─────────────────────────────────────────────────────────────

function buildPostPage(meta, htmlBody, slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.title} — Rukhsar Khan</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#1E1E1E;--fg:#F0EDE8;--muted:#908880;--accent:#C87941;
  --surface:#282828;--rule:#383830;
  --heading-font:'Cormorant Garamond',serif;
  --body-font:'DM Sans',sans-serif;
  --max-w:720px;--pad-x:5vw;
}
html{scroll-behavior:smooth;}
body{background:var(--bg);color:var(--fg);font-family:var(--body-font);font-size:17px;line-height:1.75;-webkit-font-smoothing:antialiased;}
h1,h2,h3,h4{font-family:var(--heading-font);font-weight:600;line-height:1.2;color:var(--fg);}
a{color:var(--accent);text-decoration:none;}
a:hover{opacity:0.75;}
.container{max-width:var(--max-w);margin:0 auto;padding:0 var(--pad-x);}

.nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:0 var(--pad-x);height:68px;display:flex;align-items:center;justify-content:space-between;background:rgba(30,30,30,0.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--rule);}
.nav-logo{font-family:var(--heading-font);font-size:20px;font-weight:600;color:var(--fg);}
.nav-logo span{color:var(--accent);}
.nav-back{font-size:13px;color:var(--muted);letter-spacing:0.04em;transition:color 0.2s;}
.nav-back:hover{color:var(--fg);}

.post-header{padding:120px 0 48px;border-bottom:1px solid var(--rule);margin-bottom:56px;}
.post-meta{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--accent);margin-bottom:20px;display:block;}
.post-title{font-size:clamp(36px,6vw,60px);font-weight:600;line-height:1.1;margin-bottom:20px;letter-spacing:-0.01em;}
.post-summary{font-size:18px;color:var(--muted);line-height:1.65;font-family:var(--heading-font);font-style:italic;}

.post-body{padding-bottom:100px;}
.post-body p{margin-bottom:24px;color:var(--fg);opacity:0.88;}
.post-body h2{font-size:28px;margin:48px 0 16px;}
.post-body h3{font-size:22px;margin:36px 0 12px;}
.post-body ul{padding-left:0;list-style:none;margin-bottom:24px;}
.post-body ul li{padding:4px 0 4px 20px;position:relative;color:var(--fg);opacity:0.88;}
.post-body ul li::before{content:'—';position:absolute;left:0;color:var(--accent);}
.post-body strong{color:var(--fg);font-weight:600;}
.post-body em{font-style:italic;color:var(--muted);}
.post-body a{color:var(--accent);}

.post-footer{border-top:1px solid var(--rule);padding:48px 0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;}
.back-link{font-size:13px;color:var(--muted);letter-spacing:0.04em;}
.back-link:hover{color:var(--accent);}
.cta-inline{font-family:var(--heading-font);font-style:italic;font-size:18px;color:var(--muted);}
.cta-inline a{color:var(--accent);font-style:normal;}

.footer{background:#141414;border-top:1px solid var(--rule);padding:40px var(--pad-x);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;}
.footer-logo{font-family:var(--heading-font);font-size:18px;font-weight:600;color:var(--fg);}
.footer-logo span{color:var(--accent);}
.footer-copy{font-size:12px;color:var(--muted);}
</style>
</head>
<body>

<nav class="nav">
  <a href="/" class="nav-logo">Rukhsar <span>Khan</span></a>
  <a href="/blog.html" class="nav-back">← All Posts</a>
</nav>

<article>
  <header class="post-header">
    <div class="container">
      <span class="post-meta">${formatDate(meta.date)}</span>
      <h1 class="post-title">${meta.title}</h1>
      ${meta.summary ? `<p class="post-summary">${meta.summary}</p>` : ''}
    </div>
  </header>

  <div class="post-body">
    <div class="container">
      ${htmlBody}
    </div>
  </div>

  <div class="container">
    <div class="post-footer">
      <a href="/blog.html" class="back-link">← Back to all posts</a>
      <p class="cta-inline">Working with a founder? <a href="/#contact">Let's talk.</a></p>
    </div>
  </div>
</article>

<footer class="footer">
  <div class="footer-logo">Rukhsar <span>Khan</span></div>
  <div class="footer-copy">© 2025 Rukhsar Khan. All rights reserved.</div>
</footer>

</body>
</html>`;
}

// ── main ──────────────────────────────────────────────────────────────────────

const postsDir = path.join(__dirname, 'posts');
const outputDir = path.join(__dirname, 'posts');

if (!fs.existsSync(postsDir)) {
  console.log('No posts folder found. Skipping build.');
  fs.writeFileSync(path.join(__dirname, 'posts', 'manifest.json'), '[]');
  process.exit(0);
}

fs.mkdirSync(outputDir, { recursive: true });

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));
const manifest = [];

files.forEach(file => {
  const raw = fs.readFileSync(path.join(postsDir, file), 'utf8');
  const { meta, body } = parseFrontMatter(raw);
  const slug = slugFromFilename(file);
  const htmlBody = markdownToHtml(body);
  const postHtml = buildPostPage(meta, htmlBody, slug);

  fs.writeFileSync(path.join(outputDir, `${slug}.html`), postHtml);
  console.log(`Built: posts/${slug}.html`);

  manifest.push({
    slug,
    title: meta.title || 'Untitled',
    date: meta.date || '',
    summary: meta.summary || ''
  });
});

// Sort newest first
manifest.sort((a, b) => new Date(b.date) - new Date(a.date));
fs.writeFileSync(path.join(__dirname, 'posts', 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Manifest written with ${manifest.length} post(s).`);
