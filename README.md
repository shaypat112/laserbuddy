# laserbuddy

A cinematic, scroll-driven introduction to Laser Buddy Cam, a local camera-guided workbench for learning Arduino and solderless breadboard circuits.

## Run the site

```bash
npm install
npm run dev
```

The site is frontend-only. It renders repository STL assets and illustrative scenes in WebGL. It does not implement camera tracking, AI requests, voice sessions, tutorials, the Learning Hub, project persistence/import/share-fragment handling, replay, or hardware/phone controls. The mock laptop controls and readouts are illustrations.

The complete workbench lives at [laser-buddy-cam](https://github.com/Panchangam30/laser-buddy-cam). Product content follows the October 8, 2026 capability brief. Counts describe distinct local-app collections: 50 tutorials in five categories, 32 visual starter-kit entries, 216 symptom records in 12 categories, 11 beginner guides, eight fault challenges, and a limit of 300 recent structured snapshots per project.

See [BUILD_GUIDE.md](BUILD_GUIDE.md) for local workbench prerequisites and setup. No API keys belong in this site's browser code. The site requests Google Fonts; no analytics integration is present in the inspected frontend code. Provider processing and retention policies are not established by local project storage.

## Production build

```bash
npm run build
```

There are no configured type-check or test scripts. Validate content and anchors with the production build and check the page at desktop and phone widths. Preserve the existing visual identity and chapter navigation when adding information. Do not deploy as part of a content update.
