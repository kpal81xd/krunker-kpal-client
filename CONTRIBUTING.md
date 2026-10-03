# Contributing

## Setup

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev        # build with source maps and launch with devtools
bun run lint       # prettier, eslint and type checks
bun run lint-fix   # apply prettier and eslint fixes
bun run build      # bundle into out/
bun run dist       # build installers into dist/
bun run ship       # build and publish a GitHub release (needs GH_TOKEN)
```

Electron is pinned to 7.0.0, which only ships x64 builds for macOS. On Apple Silicon, install [Rosetta](https://support.apple.com/en-us/102527) and run `npm_config_arch=x64 bun install` so the x64 Electron binary is downloaded.

## Layout

```
src/
  main.ts            main process: windows, settings, updater, Discord, shortcuts
  preload/game.ts    game window features, isolated from the krunker page
  preload/menu.ts    client menu
  preload/prompt.ts  replacement for window.prompt
  preload/splash.ts  splash and update status
static/              html, css and images copied into out/
build/               app icons used by electron-builder
```

`scripts/build.mts` bundles everything with esbuild, including runtime dependencies, so the packaged app ships no `node_modules`.

## Compatibility

Electron 7 runs Node 12.8 and Chromium 78, so the bundle targets those versions and any runtime dependency upgrade has to keep working on them. Renovate is set up to never bump Electron and to ask before bumping runtime dependencies.

Krunker's current site uses JavaScript syntax that Chromium 78 cannot parse, so the game itself may not load in this client.

## Security

- Every window runs with context isolation, without Node integration and without the `remote` module. Krunker's page cannot reach client code, and the client talks to it only through shared DOM attributes.
- Navigation is limited to `https://krunker.io`. Other `http(s)` links open in the system browser, and Discord join requests are only accepted for `https` krunker game links.
- Settings sent over IPC are checked against the known keys and types before they are saved.
- Web security is turned off in the game window only while custom models or the KPal theme are enabled, because Chromium blocks the `https` to `file://` redirects those features rely on.

## Releasing

Releases are published to this repository's GitHub releases, which the auto-updater reads. Clients installed before the repository was renamed still check `krunker-kpal-client-RELEASE`, which GitHub redirects here. Never create a repository with that name, or those clients will stop updating.
