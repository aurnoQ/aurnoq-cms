import archiver from 'archiver';
import { PassThrough } from 'node:stream';

function zipHtml(html) {
  return new Promise((resolve, reject) => {
    const output = new PassThrough(); const chunks = [];
    output.on('data', (chunk) => chunks.push(chunk)); output.on('end', () => resolve(Buffer.concat(chunks))); output.on('error', reject);
    const archive = archiver('zip', { zlib: { level: 9 } }); archive.on('error', reject); archive.pipe(output); archive.append(html, { name: 'index.html' }); archive.finalize();
  });
}

export async function deployToNetlify(html, { token = process.env.NETLIFY_AUTH_TOKEN, siteId = process.env.NETLIFY_SITE_ID } = {}) {
  if (!token || !siteId) throw new Error('Netlify is not configured. Set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID.');
  const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' }, body: await zipHtml(html) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Netlify deployment failed.');
  return { url: data.deploy_url || data.ssl_url || data.url };
}
