# AurnoQ CMS

Internal template-driven website generator using React, Vite, Tailwind CSS, Express, the filesystem, and Vercel.

## Run locally

```bash
npm install
npm run dev
```

The Vite app runs on `http://localhost:5173` and proxies `/api` requests to Express on port `3001`.

## Add a template

Create a folder under `templates/` containing `index.html` and `config.json`:

```text
templates/
  hotel/
    index.html
    config.json
```

`config.json` defines the dropdown label and generated form fields. HTML can use any matching placeholder, such as `{{BUSINESS_NAME}}`, `{{PHONE}}`, or `{{PRIMARY_COLOR}}`. The CMS discovers the folder automatically.

## Vercel deployment

Copy `.env.example` to `.env` and provide `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` before using Deploy.

## API

- `GET /api/templates`
- `GET /api/template/:id`
- `POST /api/generate`
- `POST /api/deploy`
- `GET /api/projects`
- `GET /api/project/:name`
- `POST /api/project/save`
