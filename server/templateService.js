import fs from 'node:fs/promises';
import path from 'node:path';

export function createTemplateService(templatesRoot) {
  const titleCase = (value) => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  async function readTemplate(id) {
    if (!/^[a-z0-9_-]+$/i.test(id)) return null;
    const directory = path.join(templatesRoot, id);
    try {
      const [config, html] = await Promise.all([
        fs.readFile(path.join(directory, 'config.json'), 'utf8'),
        fs.readFile(path.join(directory, 'index.html'), 'utf8'),
      ]);
      return { id, config: JSON.parse(config), html };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return null;
    }
  }

  async function listTemplates() {
    const entries = await fs.readdir(templatesRoot, { withFileTypes: true });
    const templates = [];
    for (const entry of entries.filter((item) => item.isDirectory())) {
      const template = await readTemplate(entry.name);
      if (template) templates.push({ id: template.id, name: template.config.name || titleCase(template.id), fields: template.config.fields || [], thumbnail: template.config.thumbnail || null });
    }
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  return { readTemplate, listTemplates };
}
