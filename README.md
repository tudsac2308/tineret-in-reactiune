# Tineret în Reacțiune — website

Static site (HTML + CSS + vanilla JS) for **https://tineretinreactiune.ro**, hosted on Hostico (cPanel).
Every push to `main` on GitHub is published automatically (see *Publishing*).

## Everyday changes

| What | Where |
|---|---|
| Events, sign-up link, impact numbers, Spark's tips | `site-data.js` |
| English texts | `i18n.js` |
| News articles | `_content/posts/*.html`, then run the build (below) |
| Styles | `style.css` |

### Adding a news article

1. Copy `_content/posts/caravana-povestea-ta-vocea-ta.html` to `_content/posts/<short-name>.html`.
   The file name becomes the address: `tineretinreactiune.ro/noutati/<short-name>.html`.
2. Edit the `<!--meta { … } -->` block (title, date `YYYY-MM-DD`, tags, excerpt) and the text below it.
   Tags must exist in `TAGS` at the top of `_tools/build.py`.
3. Photos: put them in `_content/foto/<short-name>/` and set `"cover": "noutati/img/<short-name>/<photo>.webp"`.
   The build makes small `.webp` copies and strips GPS data; the originals never leave this computer.
   If heads get cut off in the wide cover frame, add `"cover_focus": 20` (0 = keep the top, 100 = keep the bottom).
4. Run:

   ```bash
   python _tools/build.py
   ```

   This regenerates the article pages, `noutati.html`, the "Ultimele noutăți" box on the homepage,
   the search index, `feed.xml`, `sitemap.xml` and the offline cache version in `sw.js`.
5. Commit and push. The site updates within a minute.

To link an event to its article, add `post: 'noutati/<short-name>.html'` to the event in `site-data.js`.

## Publishing (GitHub → cPanel)

One-time setup in cPanel:

1. **Git™ Version Control → Create**: Clone URL `https://github.com/tudsac2308/tineret-in-reactiune.git`,
   Repository Path `repositories/tineret-in-reactiune`, name `tineret-in-reactiune`.
2. **Manage → Pull or Deploy → Deploy HEAD Commit** once. `.cpanel.yml` copies the site into `public_html`
   (without `_content/`, `_tools/`, `.github/`, this README).
3. **Security → Manage API Tokens → Create** (any name). Copy the token.
4. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**, add:
   `CPANEL_HOST` (server name, e.g. `glc53.hostico.ro`), `CPANEL_USER` (cPanel username),
   `CPANEL_TOKEN` (the token), `CPANEL_REPO_PATH` (`/home/<cpanel-user>/repositories/tineret-in-reactiune`).

From then on, every push runs `.github/workflows/deploy.yml`: the server pulls the commit, deploys it,
and the new pages are announced to Bing/DuckDuckGo via IndexNow.

## Checks before pushing

- Open the site locally: `python -m http.server 8811`, then http://localhost:8811
- `python _tools/build.py` must finish without `EROARE`.
