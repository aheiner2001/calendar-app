# Push instructions

Simple steps to build this app locally, push changes, and get a **live website** on GitHub Pages.

---

## One-time setup (local)

```bash
cd calendar-app
npm install
npm run dev
```

**Firebase (local only):** copy `.env.example` to `.env` and fill in your values.  
`.env` is gitignored — never commit it.

---

## One-time setup (GitHub Pages) — do this once

Your repo had **CI only** (build test). That does **not** publish a website. You need **Pages** enabled plus the **Deploy** workflow.

### Step 1 — Turn on GitHub Pages

1. Open https://github.com/aheiner2001/calendar-app  
2. Go to **Settings** → **Pages**  
3. Under **Build and deployment** → **Source**, choose **GitHub Actions** (not “Deploy from a branch”)  
4. Save

### Step 2 — Push the deploy workflow

Make sure `.github/workflows/deploy.yml` is in your repo and push:

```bash
git add .
git commit -m "Add GitHub Pages deploy workflow"
git push origin master
```

(Use `main` instead of `master` if that is your branch.)

### Step 3 — (Optional) Firebase on the live site

For Google/Apple sign-in on the **published** site, add GitHub **Secrets**:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add each name (same as in `.env`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

In **Firebase Console** → **Authentication** → **Settings** → **Authorized domains**, add:

- `aheiner2001.github.io`

For **Google sign-in**, also add in Google Cloud OAuth settings:

- Authorized JavaScript origin: `https://aheiner2001.github.io`
- Authorized redirect URI: `https://area-book.firebaseapp.com/__/auth/handler`

---

## Your live site URL

After a successful deploy:

**https://aheiner2001.github.io/calendar-app/**

Find it on GitHub:

1. **Settings** → **Pages** — shows the site URL when deployed  
2. **Actions** → **Deploy to GitHub Pages** — green run → click it → **deploy** job shows the URL  
3. Repo home — sometimes a **Deployments** link on the right

The first deploy can take **1–3 minutes** after you enable Pages.

---

## Before you push (recommended)

```bash
npm run build
```

If this fails locally, fix it before pushing.

---

## Push changes to GitHub

```bash
git status
git add .
git commit -m "Describe what you changed"
git push origin master
```

---

## What each workflow does

| Workflow | File | When it runs | What you get |
|----------|------|--------------|--------------|
| **CI** | `ci.yml` | Push or PR to `main`/`master` | Build test only (✓ or ✗) — **no website** |
| **Deploy to GitHub Pages** | `deploy.yml` | Push to `main`/`master` | Builds + publishes live site |

After you push, you should see **two** workflow runs (CI + Deploy), or one Deploy run if you only have `deploy.yml`.

---

## View Actions on GitHub

1. Open https://github.com/aheiner2001/calendar-app  
2. Click **Actions**  
3. Click **Deploy to GitHub Pages** (not only **CI**)  
4. Open the latest run → **deploy** job → see the page URL  

---

## Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Build (test) | `npm run build` |
| Stage changes | `git add .` |
| Commit | `git commit -m "your message"` |
| Push | `git push origin master` |
| Live site | https://aheiner2001.github.io/calendar-app/ |

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| Actions ran but **no Pages link** | **CI does not deploy.** Enable Pages (Source: **GitHub Actions**) and push `deploy.yml` |
| Pages says “Not published” | Finish Step 1 above, then push again to trigger **Deploy to GitHub Pages** |
| Deploy failed | Open the failed run in Actions → read the red step’s log |
| Site is blank or 404 | Wait a few minutes; confirm URL ends with `/calendar-app/` |
| Firebase login fails on live site | Add secrets in GitHub + `aheiner2001.github.io` in Firebase authorized domains |
| `git push` rejected | `git pull`, fix conflicts, push again |

---

## Do not commit

- `.env` (Firebase API keys)
- `node_modules/`
- `dist/`

These are already in `.gitignore`.
