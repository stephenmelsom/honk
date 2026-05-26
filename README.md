# honk 🪿

A beginner-friendly web app for programming the Baofeng UV-82L handheld radio.
CHIRP-compatible — opens and saves the same `.img` files.

**Live site:** https://stephenmelsom.github.io/honk/

Works in Chrome/Edge/Opera (which have the Web Serial API) for talking to the
radio over a USB programming cable. Firefox and Safari can still open and save
`.img` files.

## Features

- Read and write the Baofeng UV-82L over USB
- Full `.img` round-trip with CHIRP
- Repeater wizard that turns "146.84 −0.6 100.0 Hz" into the right rxfreq /
  txfreq / tone bytes
- One-click channel packs: NOAA weather, FRS, GMRS, MURS, ham 2m, ham 70cm
- CSV import for CHIRP exports

## Develop

```
npm install
npm run dev      # dev server
npm test         # vitest
npm run build    # production build (output in dist/)
npm run lint
```

## Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml` which builds and
publishes to GitHub Pages.
