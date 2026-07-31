import express from 'express';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTemplateService } from './templateService.js';
import { createProjectService } from './projectService.js';
import { deployToVercel } from './vercelService.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templates = createTemplateService(path.join(root, 'templates'));
const projects = createProjectService(path.join(root, 'generated'));
const app = express();
app.use(cors()); app.use(express.json({ limit: '1mb' }));

function applyPlaceholders(html, data = {}) {
  return Object.entries(data).reduce((result, [id, value]) => result.replaceAll(`{{${id}}}`, String(value ?? '')), html);
}

app.get('/api/templates', async (_req, res) => { try { res.json({ templates: await templates.listTemplates() }); } catch (error) { res.status(500).json({ error: error.message }); } });
app.get('/api/template/:id', async (req, res) => { try { const template = await templates.readTemplate(req.params.id); if (!template) return res.status(404).json({ error: 'Template not found.' }); res.json({ id: template.id, config: template.config }); } catch (error) { res.status(500).json({ error: error.message }); } });
app.post('/api/generate', async (req, res) => { try { const { template: id, data } = req.body || {}; const template = await templates.readTemplate(id); if (!template) return res.status(404).json({ error: 'Template not found.' }); const fields = template.config.fields || []; for (const field of fields) if (field.required && !String(data?.[field.id] ?? '').trim()) return res.status(400).json({ error: `${field.label || field.id} is required.` }); const normalized = Object.fromEntries(Object.entries(data || {}).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])); res.json({ template: id, data: normalized, html: applyPlaceholders(template.html, normalized) }); } catch (error) { res.status(500).json({ error: error.message }); } });
app.get('/api/projects', async (_req, res) => { try { res.json({ projects: await projects.list() }); } catch (error) { res.status(500).json({ error: error.message }); } });
app.get('/api/project/:name', async (req, res) => { try { const project = await projects.get(req.params.name); if (!project) return res.status(404).json({ error: 'Project not found.' }); res.json(project); } catch (error) { res.status(500).json({ error: error.message }); } });
app.post('/api/project/save', async (req, res) => { try { res.status(201).json(await projects.save(req.body || {})); } catch (error) { res.status(400).json({ error: error.message }); } });
app.post('/api/deploy', async (req, res) => { try { if (!req.body?.html) return res.status(400).json({ error: 'Generate a website before deploying.' }); res.json(await deployToVercel(req.body.html)); } catch (error) { res.status(400).json({ error: error.message }); } });

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`AurnoQ API running on http://localhost:${port}`));
