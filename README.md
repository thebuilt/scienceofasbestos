# Science of Asbestos Global Map

Interactive country map with:

- Status of Asbestos Use (`Banned` / `Controlled` / `Still in Use`)
- Major organisations working in the area
- Mesothelioma record-keeping notes
- Major remarks

## Data Files

- `/data/country-data.json` — easy-to-edit country records
- `/data/india-states-simplified.geojson` — India boundary source from your pinned commit

## Owner Review Workflow

Public visitors can submit updates from the form in the UI.

- Submissions are stored locally in browser queue.
- If `ownerReviewGithubRepo` is set in `/app.js`, each submission opens a prefilled GitHub Issue for owner review/approval.

## Deploy

Host with GitHub Pages and map your custom domain (`www.scienceofasbestos.org`) using `CNAME` in repo root.

Embed instructions: `/EMBED.md`
