import archiver from 'archiver';
import { PassThrough } from 'node:stream';

function zipHtml(html) {
  return new Promise((resolve, reject) => {
    const output = new PassThrough(); const chunks = [];
    output.on('data', (chunk) => chunks.push(chunk)); output.on('end', () => resolve(Buffer.concat(chunks))); output.on('error', reject);
    const archive = archiver('zip', { zlib: { level: 9 } }); archive.on('error', reject); archive.pipe(output); archive.append(html, { name: 'index.html' }); archive.finalize();
  });
}

async function waitForDeploy(deployId, token, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`https://api.netlify.com/api/v1/deploys/${deployId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const deploy = await response.json();
    if (!response.ok) throw new Error(deploy.message || 'Unable to check Netlify deploy status.');
    if (deploy.state === 'ready') return deploy;
    if (['error', 'failed'].includes(deploy.state)) throw new Error(deploy.error_message || 'Netlify deployment failed during post-processing.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Netlify deployment timed out while waiting for the site to become ready.');
}

export async function deployToNetlify(html, { token = process.env.NETLIFY_AUTH_TOKEN, siteId = process.env.NETLIFY_SITE_ID } = {}) {
  if (!token || !siteId) throw new Error('Netlify is not configured. Set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID.');
  const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' }, body: await zipHtml(html) });
  const data = await response.json();
  console.log(data);
  if (!response.ok) throw new Error(data.message || 'Netlify deployment failed.');
  const deploy = await waitForDeploy(data.id, token);
  return { url: deploy.deploy_url || deploy.ssl_url || deploy.url || data.deploy_url || data.ssl_url || data.url };
}
