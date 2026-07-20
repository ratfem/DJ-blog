const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const siteUrl = 'https://lxtus.online';
const siteTitle = 'ratpetals updates';
const siteDescription = 'Recent updates from ratpetals\' website.';
const feedFileName = 'feed.xml';
const postsDir = path.join(__dirname, 'blog', 'posts');
const excludeFiles = ['index.html'];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function extractPostsFromHtml(content, filePath) {
  const posts = [];
  const articleRegex = /<article\b[^>]*>([\s\S]*?)<\/article>/gi;
  let match;

  while ((match = articleRegex.exec(content)) !== null) {
    const article = match[1];
    const titleMatch = article.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const paragraphMatch = article.match(/<p[^>]*>([^<]+)<\/p>/i);

    if (titleMatch) {
      posts.push({
        title: titleMatch[1].trim(),
        description: paragraphMatch ? paragraphMatch[1].trim() : '',
        link: `${siteUrl}/blog/posts/${path.basename(filePath)}`,
        pubDate: fs.statSync(filePath).mtime.toUTCString()
      });
    }
  }

  return posts;
}

function collectPostsFromDir(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir)
    .filter(file => file.endsWith('.html') && !excludeFiles.includes(file))
    .sort();

  return files.flatMap(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    return extractPostsFromHtml(content, filePath);
  });
}

let posts = collectPostsFromDir(postsDir);

if (posts.length === 0) {
  console.log('No posts found. The feed will be generated with no items.');
}

posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
const lastBuildDate = new Date().toUTCString();

const items = posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${escapeXml(post.link)}</link>
      <guid isPermaLink="true">${escapeXml(post.link)}</guid>
      <pubDate>${post.pubDate}</pubDate>
      <description><![CDATA[${post.description}]]></description>
    </item>`).join('\n');

const rss = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

fs.writeFileSync(path.join(__dirname, feedFileName), rss, 'utf8');
console.log(`RSS feed generated with ${posts.length} items.`);
