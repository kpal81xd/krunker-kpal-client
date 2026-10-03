import { $ } from 'bun';
import { build } from 'esbuild';

const OUT = 'out';
const DEV = process.argv.includes('--dev');

await $`rm -rf ${OUT} && cp -R static ${OUT}`;

await build({
    entryPoints: {
        main: 'src/main.ts',
        'preload/game': 'src/preload/game.ts',
        'preload/menu': 'src/preload/menu.ts',
        'preload/prompt': 'src/preload/prompt.ts',
        'preload/splash': 'src/preload/splash.ts',
    },
    outdir: OUT,
    bundle: true,
    platform: 'node',
    format: 'cjs',

    // electron 7 runs node 12.8 and chromium 78
    target: ['node12.8', 'chrome78'],

    // optional native modules loaded behind try/catch by ws and discord-rpc
    external: ['electron', 'bufferutil', 'utf-8-validate', 'register-scheme'],
    minify: !DEV,
    sourcemap: DEV ? 'inline' : false,
    logLevel: 'info',
});
