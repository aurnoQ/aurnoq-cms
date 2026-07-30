import { createHash } from 'node:crypto';

const NETLIFY_API = 'https://api.netlify.com/api/v1';

async function netlifyRequest(url, options, token) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const responseText = await response.text();
  let data = {};
  try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = { message: responseText }; }
  if (!response.ok) throw new Error(data.message || data.error_message || 'Netlify API request failed.');
  return data;
}

async function waitForDeploy(deployId, token, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const deploy = await netlifyRequest(`${NETLIFY_API}/deploys/${deployId}`, {}, token);
    if (deploy.state === 'ready') return deploy;
    if (['error', 'failed'].includes(deploy.state)) throw new Error(deploy.error_message || 'Netlify deployment failed during post-processing.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Netlify deployment timed out while waiting for the site to become ready.');
}

export async function deployToNetlify(html, { token = process.env.NETLIFY_AUTH_TOKEN, siteId = process.env.NETLIFY_SITE_ID } = {}) {
  if (!token || !siteId) throw new Error('Netlify is not configured. Set NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID.');

  const contents = Buffer.from(html, 'utf8');
  const headersContents = Buffer.from('/index.html\n  Content-Type: text/html; charset=UTF-8\n', 'utf8');
  const files = {
    '/index.html': createHash('sha1').update(contents).digest('hex'),
    '/_headers': createHash('sha1').update(headersContents).digest('hex'),
  };
  const deploy = await netlifyRequest(`${NETLIFY_API}/sites/${siteId}/deploys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  }, token);

  const uploadFiles = { 'index.html': contents, _headers: headersContents };
  for (const [filePath, fileContents] of Object.entries(uploadFiles)) {
    const fileHash = files[`/${filePath}`];
    if (!deploy.required?.includes(fileHash)) continue;
    await netlifyRequest(`${NETLIFY_API}/deploys/${deploy.id}/files/${filePath}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: fileContents,
    }, token);
  }

  const readyDeploy = await waitForDeploy(deploy.id, token);
  return { url: readyDeploy.deploy_url || readyDeploy.ssl_url || readyDeploy.url || deploy.deploy_url || deploy.ssl_url || deploy.url };
}
