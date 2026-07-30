import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const icon = { stroke: 'currentColor', strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
const Sparkle = () => <svg viewBox="0 0 24 24" className="icon"><path {...icon} d="m12 3-1.1 5.9L6 11l4.9 2.1L12 19l1.1-5.9L18 11l-4.9-2.1L12 3ZM19 17l-.5 2.5L16 20l2.5.5L19 23l.5-2.5L22 20l-2.5-.5L19 17Z" /></svg>;
const Monitor = () => <svg viewBox="0 0 24 24" className="icon"><rect {...icon} x="3" y="4" width="18" height="13" rx="2" /><path {...icon} d="M8 21h8m-4-4v4" /></svg>;
const Arrow = () => <svg viewBox="0 0 24 24" className="arrow"><path {...icon} d="M5 12h14m-6-6 6 6-6 6" /></svg>;

function DeployModal({ url, copied, onCopy, onClose }) {
  if (!url) return null;
  return <div className="deploy-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="deploy-modal" role="dialog" aria-modal="true" aria-labelledby="deploy-title">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      <div className="deploy-success-icon">✓</div>
      <p className="deploy-kicker">DEPLOYMENT COMPLETE</p>
      <h2 id="deploy-title">Your website is live.</h2>
      <p className="deploy-description">Share this link or open your new website in a new tab.</p>
      <div className="deploy-url-box"><span>{url}</span><button onClick={onCopy}>{copied ? 'Copied!' : 'Copy link'}</button></div>
      <div className="deploy-modal-actions"><a href={url} target="_blank" rel="noreferrer">Open website ↗</a><button onClick={onClose}>Done</button></div>
    </section>
  </div>;
}

function App() {
  const [templates, setTemplates] = useState([]); const [template, setTemplate] = useState(''); const [fields, setFields] = useState([]); const [data, setData] = useState({});
  const [projects, setProjects] = useState([]); const [projectName, setProjectName] = useState(''); const [html, setHtml] = useState(''); const [status, setStatus] = useState({ type: '', message: '' }); const [deployUrl, setDeployUrl] = useState(''); const [copied, setCopied] = useState(false); const [loading, setLoading] = useState(false);

  useEffect(() => { Promise.all([fetch(`${API}/api/templates`).then((r) => r.json()), fetch(`${API}/api/projects`).then((r) => r.json())]).then(([templateResult, projectResult]) => { const list = templateResult.templates || []; setTemplates(list); if (list[0]) { setTemplate(list[0].id); setFields(list[0].fields || []); } setProjects(projectResult.projects || []); }).catch(() => setStatus({ type: 'error', message: 'Could not load CMS data.' })); }, []);
  useEffect(() => { if (!template) return; const selected = templates.find((item) => item.id === template); setFields(selected?.fields || []); setData({}); setHtml(''); }, [template]);

  const updateField = (id, value) => setData((current) => ({ ...current, [id]: value }));
  async function generate() { setLoading(true); setStatus({ type: '', message: '' }); try { const response = await fetch(`${API}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template, data }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Generation failed.'); setData(result.data); setHtml(result.html); setStatus({ type: 'success', message: 'Preview generated successfully.' }); } catch (error) { setStatus({ type: 'error', message: error.message }); } finally { setLoading(false); } }
  async function saveProject() { if (!html) return setStatus({ type: 'error', message: 'Generate a preview before saving.' }); try { const name = projectName.trim() || data.BUSINESS_NAME || template; const response = await fetch(`${API}/api/project/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, template, data }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); setProjects((current) => [result, ...current.filter((item) => item.name !== result.name)]); setStatus({ type: 'success', message: `Saved ${result.name}.` }); } catch (error) { setStatus({ type: 'error', message: error.message }); } }
  async function loadProject(name) { try { const response = await fetch(`${API}/api/project/${encodeURIComponent(name)}`); const project = await response.json(); if (!response.ok) throw new Error(project.error); setTemplate(project.template); setProjectName(project.name); const generated = await fetch(`${API}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: project.template, data: project.data }) }); const result = await generated.json(); if (!generated.ok) throw new Error(result.error); setData(result.data); setHtml(result.html); setStatus({ type: 'success', message: `Loaded ${project.name}.` }); } catch (error) { setStatus({ type: 'error', message: error.message }); } }
  async function deploy() { if (!html) return setStatus({ type: 'error', message: 'Generate a preview before deploying.' }); setLoading(true); setStatus({ type: '', message: '' }); try { const response = await fetch(`${API}/api/deploy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ html }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Deployment failed.'); setDeployUrl(result.url || ''); setCopied(false); setStatus({ type: 'success', message: 'Website deployed successfully.' }); } catch (error) { setStatus({ type: 'error', message: error.message }); } finally { setLoading(false); } }
  async function copyDeployUrl() { if (!deployUrl) return; await navigator.clipboard.writeText(deployUrl); setCopied(true); }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">A</span><span>AurnoQ <em>CMS</em></span></div><div className="topbar-note"><span className="status-dot" /> Internal workspace</div></header>
    <main className="main-content"><section className="intro"><div className="eyebrow"><Sparkle /> SITE GENERATOR</div><h1>Turn a name into<br /><span>a beautiful website.</span></h1><p>Choose a template, add your business details, and get a polished online presence in seconds.</p></section>
      <section className="workspace"><div className="control-panel"><div className="section-label">01 <span>Website details</span></div><h2>Let’s get started.</h2><p className="helper">Make it yours with a few simple details.</p><label>Template<select value={template} onChange={(e) => setTemplate(e.target.value)}>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{fields.map((field) => <label key={field.id}>{field.label || field.id}<div className="input-wrap"><input type={field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : 'text'} required={field.required} value={data[field.id] || ''} onChange={(e) => updateField(field.id, e.target.value)} placeholder={field.placeholder || ''} /><span>{data[field.id]?.length || 0}</span></div></label>)}<button className="primary-button" onClick={generate} disabled={loading || !template}>{loading ? 'Working…' : 'Generate website'} {!loading && <Arrow />}</button>{status.message && <div className={`notice ${status.type}`}>{status.type === 'success' ? '✓ ' : '! '}{status.message}</div>}<div className="tip"><span>✦</span><div><strong>Quick tip</strong><br />Every field comes from this template’s config.json.</div></div><div className="project-tools"><input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name (optional)" /><div><button onClick={saveProject} disabled={!html}>Save project</button><select value="" onChange={(e) => e.target.value && loadProject(e.target.value)}><option value="">Open saved project…</option>{projects.map((project) => <option key={project.name} value={project.name}>{project.name}</option>)}</select></div></div></div>
        <div className="preview-panel"><div className="preview-heading"><div><div className="section-label">02 <span>Live preview</span></div><h2>See it come to life.</h2></div><div className="preview-actions"><span className="live-pill"><i /> LIVE</span><button onClick={deploy} disabled={!html || loading}><Monitor /> Deploy</button></div></div><div className="browser"><div className="browser-bar"><div className="browser-dots"><i /><i /><i /></div><div className="browser-url">preview.aurnoq.local</div><div /></div><div className="iframe-frame">{html ? <iframe title="Generated website preview" srcDoc={html} /> : <div className="empty-preview"><div className="empty-icon"><Sparkle /></div><strong>Your preview will appear here</strong><span>Fill in your details and click generate to see your website.</span></div>}</div></div></div></section>
      <footer>Built for internal use <span>•</span> AurnoQ <span>•</span> v1.0</footer>
    </main>
    <DeployModal url={deployUrl} copied={copied} onCopy={copyDeployUrl} onClose={() => setDeployUrl('')} />
  </div>;
}

export default App;
