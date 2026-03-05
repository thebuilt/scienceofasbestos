# Google Sites Embed Code

Use this after hosting the page on GitHub Pages (or your own domain):

```html
<iframe
  src="https://www.scienceofasbestos.org/"
  title="Global Asbestos Status Map"
  width="100%"
  height="860"
  style="border:0;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  allowfullscreen>
</iframe>
```

## Suggested Hosting Setup

1. Push this project to a GitHub repository.
2. Enable **GitHub Pages** from the repository (branch: `main`, folder: `/root`).
3. In repository root, add `CNAME` file with:
   ```
   www.scienceofasbestos.org
   ```
4. In your DNS provider for `scienceofasbestos.org`, point `www` to GitHub Pages (CNAME to `<your-github-username>.github.io`).
5. Once DNS is live, use the iframe snippet above in Google Sites via **Embed > Embed code**.

## Owner Review Routing

To route update submissions to owner review in GitHub Issues:

- Edit `/app.js`
- Set:
  ```js
  ownerReviewGithubRepo: "<org-or-username>/<repo-name>"
  ```

Then each public submission opens a prefilled issue for owner approval.
