# honk 🪿

A beginner-friendly web app for programming common amateur radios.
CHIRP/ADMS-compatible — opens and saves supported radio image files.

**Live site:** https://stephenmelsom.github.io/honk/

Works in Chrome/Edge/Opera (which have the Web Serial API) for talking to the
radio over a USB programming cable. Firefox and Safari can still open and save
radio image files.

## Features

- Read and write Baofeng UV-5R, UV-6/UV-7, UV-82, UV-82HP, and UV-82L radios over USB
- Open and save Yaesu FTM-100DR ADMS-style `.dat` memory images
- Full `.img` round-trip with CHIRP for supported Baofeng radios
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
