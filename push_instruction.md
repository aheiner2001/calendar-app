# Push instructions

Simple steps to build this app locally and push changes so **GitHub Actions** runs automatically.

---

## One-time setup

```bash
# 1. Go to the project folder
cd calendar-app

# 2. Install dependencies
npm install

# 3. (Optional) Run locally while developing
npm run dev
```

**Firebase keys:** copy `.env.example` to `.env` and fill in your values.  
`.env` is gitignored — never commit it.

---

## Before you push (recommended)

```bash
# Make sure the app builds without errors
npm run build
```

If this fails, fix the errors before pushing.

---

## Push changes to GitHub

Run these from the project folder:

```bash
# 1. See what changed
git status

# 2. Stage files you want to commit
git add .

# Or stage specific files only:
# git add src/ package.json

# 3. Commit with a short message
git commit -m "Describe what you changed"

# 4. Push to GitHub
git push origin master
```

If your default branch is `main` instead of `master`, use:

```bash
git push origin main
```

**First push on a new repo:**

```bash
git branch -M main          # optional: rename branch to main
git push -u origin main     # or: git push -u origin master
```

---

## What GitHub Actions does

When you **push** or open a **pull request** to `main` or `master`, GitHub runs the workflow in `.github/workflows/ci.yml`:

1. Checks out your code  
2. Installs Node.js  
3. Runs `npm ci` (clean install)  
4. Runs `npm run build`  

If the build passes, you’ll see a green check on GitHub. If it fails, you’ll see a red X — open the job logs to see why.

---

## View Actions on GitHub

1. Open your repo: https://github.com/aheiner2001/calendar-app  
2. Click the **Actions** tab  
3. Click the latest workflow run to see logs  

You can also see a ✓ or ✗ next to each commit on the **Commits** page.

---

## Quick reference

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Build (test) | `npm run build` |
| Stage all changes | `git add .` |
| Commit | `git commit -m "your message"` |
| Push | `git push origin master` |

---

## Troubleshooting

| Problem | What to do |
|---------|------------|
| `git push` rejected | Run `git pull` first, resolve conflicts, then push again |
| Actions not running | Confirm you pushed to `main` or `master` and the `.github/workflows/ci.yml` file is in the repo |
| Build fails in Actions | Run `npm run build` locally — fix the same error, commit, push again |
| Secrets / `.env` missing in CI | Normal — the build does not need Firebase keys. Only add GitHub Secrets if you deploy from Actions later |

---

## Do not commit

- `.env` (Firebase API keys)
- `node_modules/`
- `dist/`

These are already listed in `.gitignore`.
