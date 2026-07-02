# Storeganise Sales Dashboard — hosted with Google sign-in (Vercel, free)

This folder is a ready-to-deploy site. The dashboard (`index.html`) is blocked behind
**"Continue with Google"**, and only **@storeganise.com** Google accounts can get in.
Nothing here is public until someone signs in with a Storeganise account.

## What's in here

| File | What it does |
|---|---|
| `index.html` | The dashboard (replace this each Monday with the new build). |
| `login.html` | The sign-in page (Google button only). |
| `middleware.js` | Runs before every request; blocks the dashboard unless you have a valid session. |
| `api/auth/start.js` | Sends the user to Google's sign-in screen. |
| `api/auth/callback.js` | Verifies the Google account, checks it's `@storeganise.com`, then creates the session. |
| `api/logout.js` | Clears the session (visit `/api/logout` to sign out). |
| `auth.js` | Shared crypto helpers (signs/verifies the session). |
| `api/login.js` | Disabled stub (password login is off). Safe to delete. |
| `package.json`, `vercel.json` | Config so Vercel runs the login gate. |

The `@storeganise.com` restriction is hardcoded in `api/auth/callback.js` (constant `ALLOWED_DOMAIN`), so it can't be turned off by a missing setting.

---

## Deploy it (~15 min, all free)

### 1. Put this `deploy` folder in a private GitHub repo
Create a **private** repo, then drag these files in (keep the `api/` folders).

### 2. Import it into Vercel
- vercel.com → **Add New → Project → Import** your repo.
- Framework Preset: **Other**. Leave build settings default. Click **Deploy**.
- After it deploys, **copy your production URL** — something like `https://storeganise-dashboard.vercel.app`. You'll need it in the next step.

### 3. Finish the Google OAuth client
You already created the OAuth client (you have a Client ID). Now:
1. In **console.cloud.google.com → APIs & Services → Credentials**, open your OAuth client.
2. Under **Authorized redirect URIs**, add your real URL + `/api/auth/callback`, e.g.:
   ```
   https://storeganise-dashboard.vercel.app/api/auth/callback
   ```
   (Use YOUR actual Vercel URL from step 2 — see the note below.) Save.
3. On the **OAuth consent screen**, set **User type = Internal** (since Storeganise uses Google Workspace) — that way Google itself only allows @storeganise.com accounts, on top of our own check.

### 4. Add three Environment Variables in Vercel, then redeploy
Vercel → your project → **Settings → Environment Variables**:

| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | `590181109197-vm2qf1e0asit3qq40hvv7fndcf0gmabs.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | the client **secret** from the same Google OAuth client |
| `AUTH_SECRET` | a long random string — generate with `openssl rand -hex 32` |

Then **Deployments → ⋯ → Redeploy** so the variables take effect.

### 5. Test
Open your Vercel URL → you're sent to the login page → **Continue with Google** → sign in with your `@storeganise.com` account → the dashboard loads. A non-Storeganise Google account is rejected with a clear message.

---

## About the redirect URI ("YOUR-APP")

`https://YOUR-APP.vercel.app/api/auth/callback` was a **placeholder** — `YOUR-APP` is not literal.
Replace it with your **actual** Vercel project URL, which you only know **after** you deploy (step 2).
Google requires this to match **exactly**, so:
- Deploy first → copy the production URL Vercel gives you → paste `<that-url>/api/auth/callback` into Google's Authorized redirect URIs.
- If you later add a custom domain, add that domain's `/api/auth/callback` too.

---

## Everyday use

- **Add/remove people:** managed by Google — anyone with a working `@storeganise.com` account can sign in; remove their Google account and they're out. No code or settings to change.
- **Update the dashboard each Monday:** replace `index.html` in the repo (drag-drop in GitHub → commit). Vercel redeploys automatically; the URL and sign-in stay the same.
- **Put it in Notion:** paste the Vercel URL and choose **"Create link"** (not Embed — a login-protected page won't embed). Add your summary text above it.

## Security notes

- Traffic is HTTPS (Vercel default). Identity is verified by Google; we check the token server-side and require the `@storeganise.com` domain.
- The session cookie is **HttpOnly + Secure + signed** (HMAC-SHA256), so it can't be read by scripts or forged. Sessions last 24h (`MAX_AGE` in `auth.js`).
- Keep `GOOGLE_CLIENT_SECRET` and `AUTH_SECRET` only in Vercel's Environment Variables — never commit them to the repo.
