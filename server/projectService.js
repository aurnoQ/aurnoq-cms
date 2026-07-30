import fs from 'node:fs/promises';
import path from 'node:path';

export function createProjectService(projectsRoot) {
  const safeName = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `project-${Date.now()}`;
  const fileFor = (name) => path.join(projectsRoot, `${safeName(name)}.json`);

  async function save({ name, template, data }) {
    if (!template || !data || typeof data !== 'object') throw new Error('Template and project data are required.');
    const project = { template, data, createdAt: new Date().toISOString() };
    const filename = `${safeName(name || data.BUSINESS_NAME || template)}.json`;
    await fs.writeFile(path.join(projectsRoot, filename), `${JSON.stringify(project, null, 2)}\n`, 'utf8');
    return { name: filename.replace(/\.json$/, ''), ...project };
  }

  async function list() {
    const entries = await fs.readdir(projectsRoot, { withFileTypes: true });
    return Promise.all(entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).map(async (entry) => {
      const project = JSON.parse(await fs.readFile(path.join(projectsRoot, entry.name), 'utf8'));
      return { name: entry.name.replace(/\.json$/, ''), ...project };
    }));
  }

  async function get(name) {
    try { return { name: safeName(name), ...JSON.parse(await fs.readFile(fileFor(name), 'utf8')) }; }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }

  return { save, list, get };
}
