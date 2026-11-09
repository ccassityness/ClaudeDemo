# ClaudeDemo
Claude for AI IN Age of Humanities

## Puppy Passport

A kawaii-themed static GitHub Pages site (`index.html`, `styles.css`, `app.js`, `match.js`,
`cartoon.js`) built from `puppy_passport_breeds.json`. Plain HTML, CSS and JavaScript, no build
step.

Every breed has a cartoon dog drawn by `cartoon.js`, used as the passport photo on its card and
in the stamp collection, quiz results and breed details.

- **Passport**: each breed is a little passport ID page with its cartoon photo. Search and filter all 617 breeds by group, country, living/extinct and
  whether you've seen them, then stamp the ones you meet. Stamps (with the date) are saved
  in your browser's localStorage.
- **My stamps**: progress per breed group, countries "visited", your stamp collection, and
  download/restore of your passport as a JSON file.
- **Find my breed**: a short lifestyle quiz scored against AKC trait ratings (269 breeds)
  that suggests breeds to consider adopting.

### Run locally

The page loads the JSON with `fetch`, so open it through a web server, not as a file:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

### Publish on GitHub Pages

Settings → Pages → Deploy from a branch → pick the branch and `/ (root)`.
