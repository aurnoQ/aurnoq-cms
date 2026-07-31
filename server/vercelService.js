const VERCEL_API = 'https://api.vercel.com';

async function vercelRequest(url, options, token) {
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const responseText = await response.text();
  let data = {};
  try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = { error: { message: responseText } }; }
  if (!response.ok) throw new Error(data.error?.message || data.message || 'Vercel API request failed.');
  return data;
}

async function waitForDeployment(deploymentId, token, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const deployment = await vercelRequest(`${VERCEL_API}/v13/deployments/${deploymentId}`, {}, token);
    if (deployment.readyState === 'READY') return deployment;
    if (['ERROR', 'CANCELED'].includes(deployment.readyState)) throw new Error(deployment.errorMessage || 'Vercel deployment failed.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Vercel deployment timed out while waiting for the site to become ready.');
}

export async function deployToVercel(html, { token = process.env.VERCEL_TOKEN, projectId = process.env.VERCEL_PROJECT_ID } = {}) {
  if (!token || !projectId) throw new Error('Vercel is not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID.');
  const deployment = await vercelRequest(`${VERCEL_API}/v13/deployments?skipAutoDetectionConfirmation=1&forceNew=1`, {
    method: 'POST',
    body: JSON.stringify({ name: 'aurnoq-cms-site', project: projectId, target: 'production', projectSettings: { framework: null }, files: [{ file: 'index.html', data: Buffer.from(html, 'utf8').toString('base64'), encoding: 'base64' }] }),
  }, token);
  const readyDeployment = await waitForDeployment(deployment.id, token);
  return { url: readyDeployment.url ? `https://${readyDeployment.url}` : deployment.url ? `https://${deployment.url}` : null };
}
