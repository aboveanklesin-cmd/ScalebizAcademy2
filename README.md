# ScaleBiz Academy

Challenge-based marketing credentials platform.

## Project structure

```
scalebiz-academy/
├── index.html          ← Landing page
├── dashboard.html      ← Student dashboard
├── netlify.toml        ← Netlify routing config
├── README.md
│
├── css/
│   ├── main.css        ← Landing page styles
│   └── dashboard.css   ← Dashboard styles
│
├── js/
│   ├── supabase.js     ← Supabase client (shared by all pages)
│   ├── auth.js         ← OTP login & modal logic
│   └── dashboard.js    ← Dashboard data loading & UI
│
└── assets/             ← Logos, images, icons
```

## Stack
- **Hosting** — Netlify
- **Auth** — Supabase Auth (email OTP)
- **Database** — Supabase PostgreSQL
- **Frontend** — HTML, CSS, Vanilla JavaScript

## Local development
1. Open this folder in VS Code
2. Install the Live Server extension
3. Right-click index.html → Open with Live Server
4. Edit any file — browser refreshes instantly

## Deploy
Push to GitHub → Netlify auto-deploys within seconds.
