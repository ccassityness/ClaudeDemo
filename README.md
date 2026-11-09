# ClaudeDemo
Claude for AI IN Age of Humanities

## Puppy Passport

A kawaii-themed static GitHub Pages site (`index.html`, `styles.css`, `app.js`, `match.js`,
`cartoon.js`, `photos.js`) built from `puppy_passport_breeds.json`. Plain HTML, CSS and
JavaScript, no build step.

Every breed has a cartoon dog face drawn by `cartoon.js`. Switch to **Photos** to see each
breed's lead image from its Wikipedia article instead. Photos are fetched in the visitor's
browser and fall back to the cartoon when an article has no image or Wikipedia can't be reached.

- **Passport**: search and filter all 617 breeds by group, country, living/extinct and
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
