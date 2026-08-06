# Greystone Communities — interactive map

Custom code powering the communities map on
**https://www.greystonecommunities.com/experience**.

The site itself is **Webflow**. This repo holds only the two files the page pulls in at
runtime — it is not a build, there is no bundler, and there are no dependencies to install.

| File | What it does |
|---|---|
| `maps.js` | Reads location data out of the Webflow CMS list in the DOM, builds a Google Map, renders ~142 markers with clustering, and drives the filter/search/popup UI |
| `maps.css` | Styles for the map cards, popups and filter panel |

## How it reaches production

There is no deploy pipeline. **The published git tag *is* the deploy**, served straight to the
browser by jsDelivr and referenced from the Experience page's custom code in Webflow:

```
git tag  ──►  jsDelivr CDN  ──►  <script> in Webflow page custom code  ──►  publish
```

```html
<script src="https://cdn.jsdelivr.net/gh/Everbraver/greystone-communities@1.7.0/maps.js"></script>
<link  href="https://cdn.jsdelivr.net/gh/Everbraver/greystone-communities@1.0.0/maps.css" rel="stylesheet">
```

### To ship a change

1. Edit `maps.js` / `maps.css` on `main`, commit, push.
2. Create and push a **new** version tag (`v1.8.0`, `v1.9.0`, …).
3. Update the version in the Experience page's custom code in Webflow.
4. Publish to `greystone-dev.webflow.io` **first**, verify, then publish to the live domain.

## Two traps that will cost you an afternoon

**1. jsDelivr tags are immutable.** Overwriting an existing tag does *not* propagate — the CDN
serves the original content forever. Always cut a new version. (This is also what makes rollback
safe: every previously shipped version stays permanently reachable.)

**2. A Google Maps `mapId` belongs to one specific Google Cloud project.** If the API key is
ever moved to a different project, the `mapId` in `maps.js` must be recreated in the new project
too. Swapping only the key produces `InvalidMapIdError` — a map that is broken in a new and
confusing way.

## Verify a change before calling it done

The failure mode this code is most prone to is a **race** — it only appears on a cold cache, so
reloading in your own browser will show a working map and hide the bug completely. Always verify
with a fresh browser profile:

```bash
perl -e 'alarm 70; exec @ARGV or die' -- \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-first-run --no-sandbox \
  --user-data-dir="$(mktemp -d)" \
  --enable-logging=stderr --v=1 --virtual-time-budget=14000 \
  --screenshot=verify.png --window-size=1400,3000 \
  "https://www.greystonecommunities.com/experience" 2> verify.txt
grep -a CONSOLE verify.txt | sed 's/.*CONSOLE:[0-9]*\] //'
```

Passing means all four: no `google is not defined`, no `MapError` of any kind, no
`For development purposes only` watermark in the screenshot, and ~142 markers rendering.

## Runtime dependencies (all loaded from the Webflow page, not from here)

| Dependency | Note |
|---|---|
| Google Maps JavaScript API | Must be loaded with `&loading=async&callback=__initMap` — `maps.js` waits on that callback |
| `@googlemaps/markerclusterer` | **Pin the version.** Unpinned, a breaking major release takes the map down with nobody touching anything |
| Finsweet Attributes `cmsload` | Fires the init callback once the CMS list has rendered. v1 is legacy — migrating to v2 is on the backlog |

## History

Built by Casual Sushi (2023). Mirrored to `Everbraver` on 2026-08-06 with full history and all
tags; the original `casual-sushi/greystone-communities` is retained untouched as a second copy.
