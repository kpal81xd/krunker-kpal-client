import { readdirSync, statSync } from 'fs';
import { cpus } from 'os';
import { join, resolve, sep } from 'path';
import { pathToFileURL } from 'url';

import DiscordRPC from 'discord-rpc';
import type { BrowserWindowConstructorOptions, Event, IpcMainEvent } from 'electron';
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import localshortcut from 'electron-localshortcut';
import log from 'electron-log';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';

import { ACTIVITIES, CLIENT_ID, CONFIG_DEFAULTS, GAME_URL, NO_CACHE } from './constants';
import type { Action, Activity, Config, ConfigKey, GameInfo, Init, Status } from './types';
import { isWebUrl, pageType, tryCatch } from './utils';

const DEBUG = process.argv.includes('--dev');
const AMD_CPU = cpus().some((c) => c.model.toLowerCase().includes('amd'));

Object.assign(console, { log: log.info, info: log.info, warn: log.warn, error: log.error, debug: log.debug });
log.debug('==================== KPal Client Start ====================');
process.on('uncaughtException', (e) => console.error(e));

const store = new Store<Config>({ defaults: CONFIG_DEFAULTS });

/** older builds stored slider values as strings, so values are coerced back to the default's type */
const readConfig = () => {
    const entries = (Object.keys(CONFIG_DEFAULTS) as ConfigKey[]).map((key) => {
        const def = CONFIG_DEFAULTS[key];
        const val: unknown = store.get(key);
        if (typeof def === 'number') {
            const num = Number(val);
            return [key, Number.isFinite(num) ? num : def];
        }
        return [key, typeof val === typeof def ? val : def];
    });
    return Object.fromEntries(entries) as Config;
};

const config = readConfig();

let splash: BrowserWindow | null = null;
let game: BrowserWindow | null = null;
let social: BrowserWindow | null = null;
let menu: BrowserWindow | null = null;
let prompt: BrowserWindow | null = null;
let started = false;

const devTools = (win: BrowserWindow) => DEBUG && win.webContents.openDevTools({ mode: 'undocked' });

/** local ui windows run their logic in an isolated preload and can never leave their html page */
const uiWindow = (page: string, opts: BrowserWindowConstructorOptions) => {
    const win = new BrowserWindow({
        frame: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        show: false,
        transparent: true,
        ...opts,
        webPreferences: {
            preload: join(__dirname, 'preload', `${page}.js`),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
        },
    });
    win.webContents.on('will-navigate', (e) => e.preventDefault());
    win.webContents.on('new-window', (e) => e.preventDefault());
    void win.loadFile(join(__dirname, 'html', `${page}.html`));
    return win;
};

/** keeps krunker pages in their own windows and sends every other web link to the browser */
const route = (e: Event, url: string) => {
    e.preventDefault();
    const type = pageType(url);
    if (type === 'game') {
        void game?.loadURL(url, NO_CACHE);
    } else if (type) {
        void (social ?? createSocial()).loadURL(url, NO_CACHE);
    } else if (isWebUrl(url)) {
        void shell.openExternal(url);
    }
};

const isFrom = (e: Pick<IpcMainEvent, 'sender'>, win: BrowserWindow | null) => !!win && e.sender === win.webContents;

if (!config.tools_vsync) {
    app.commandLine.appendSwitch('disable-frame-rate-limit');
    if (AMD_CPU) {
        app.commandLine.appendSwitch('disable-zero-copy');
        app.commandLine.appendSwitch('ui-disable-partial-swap');
    }
}
if (config.tools_d3d9) {
    app.commandLine.appendSwitch('use-angle', 'd3d9');
    app.commandLine.appendSwitch('enable-webgl2-compute-context');
    app.commandLine.appendSwitch('renderer-process-limit', '100');
    app.commandLine.appendSwitch('max-active-webgl-contexts', '100');
}
app.commandLine.appendSwitch('force-color-profile', config.tools_colorProfile);
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('ignore-gpu-blacklist');

for (const signal of ['SIGTERM', 'SIGHUP', 'SIGINT', 'SIGBREAK'] as const) {
    process.on(signal, () => app.quit());
}

const createSplash = () => {
    splash = uiWindow('splash', { width: 700, height: 300 });
    splash.once('ready-to-show', () => {
        splash?.show();
        if (splash) {
            devTools(splash);
        }
        checkForUpdates();
    });
    splash.on('closed', () => (splash = null));
};

const start = () => {
    if (started) {
        return;
    }
    started = true;
    createGame();
    createSocial();
    createMenu();
    registerKeybinds();
};

const checkForUpdates = () => {
    // mac builds are unsigned so they cannot self-update
    if (!app.isPackaged || DEBUG || process.platform === 'darwin') {
        return start();
    }
    const send = (state: string, value?: number) => splash?.webContents.send('update', state, value);
    autoUpdater.logger = log;
    autoUpdater.on('update-available', () => send('available'));
    autoUpdater.on('download-progress', (p: { percent: number }) => send('progress', Math.floor(p.percent)));
    autoUpdater.on('update-downloaded', () => autoUpdater.quitAndInstall());
    autoUpdater.once('update-not-available', () => {
        send('none');
        start();
    });

    // a failed update check should never keep the client from opening
    autoUpdater.once('error', () => {
        send('error');
        start();
    });

    // resolves null without emitting events when updates are unsupported, e.g. linux outside an AppImage
    autoUpdater
        .checkForUpdates()
        .then((res) => res ?? start())
        .catch(() => undefined);
};

/** maps krunker asset urls (host + path) to local files that replace them */
const assetRedirects = () => {
    const files = new Map<string, string>();
    const add = (dir: string, host: string) => {
        const root = resolve(dir);
        const walk = (path: string): void =>
            readdirSync(path).forEach((name) => {
                const full = join(path, name);
                if (statSync(full).isDirectory()) {
                    return walk(full);
                }
                files.set(host + full.slice(root.length).split(sep).join('/'), pathToFileURL(full).href);
            });
        const [err] = tryCatch(() => walk(root));
        if (err) {
            console.error('Failed to read asset folder', root, err);
        }
    };
    if (config.tools_customModels && config.tools_folderModels) {
        add(config.tools_folderModels, 'assets.krunker.io');
    }
    if (config.tools_theme) {
        add(join(__dirname, 'img', 'theme'), 'krunker.io');
    }
    return files;
};

const createGame = () => {
    const redirects = assetRedirects();
    game = new BrowserWindow({
        width: 1600,
        height: 900,
        show: false,
        webPreferences: {
            preload: join(__dirname, 'preload', 'game.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,

            // chromium blocks https -> file:// redirects, so local asset overrides need web security off
            webSecurity: redirects.size === 0,
        },
    });
    void game.loadURL(GAME_URL, NO_CACHE);

    game.once('ready-to-show', () => {
        splash?.close();
        game?.show();
        if (game) {
            devTools(game);
        }
    });

    if (redirects.size > 0) {
        const urls = [...redirects.keys()].map((k) => `*://${k}*`);
        game.webContents.session.webRequest.onBeforeRequest({ urls }, ({ url }, callback) => {
            const [, parsed] = tryCatch(() => new URL(url));
            const target = parsed && redirects.get(parsed.host + parsed.pathname);
            callback(target ? { redirectURL: target } : {});
        });
    }

    game.webContents.on('will-navigate', route);
    game.webContents.on('new-window', route);
    game.webContents.on('did-navigate-in-page', (_, url) => {
        if (pageType(url) === 'game' && url.includes('?')) {
            menu?.webContents.send('game-url', url);
        }
    });
    game.on('focus', () => menu?.hide());
    game.on('closed', () => (game = null));
};

const createSocial = () => {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        ...(game ? { parent: game } : {}),
        webPreferences: { contextIsolation: true, nodeIntegration: false, enableRemoteModule: false },
    });
    win.once('ready-to-show', () => {
        win.show();
        devTools(win);
    });
    win.webContents.on('will-navigate', route);
    win.webContents.on('new-window', route);
    win.on('focus', () => menu?.hide());
    win.on('closed', () => (social = null));
    social = win;
    return win;
};

const createMenu = () => {
    menu = uiWindow('menu', { width: 700, height: 500, ...(game ? { parent: game } : {}) });
    menu.once('ready-to-show', () => menu && devTools(menu));
    menu.on('closed', () => (menu = null));
};

const registerKeybinds = () => {
    const toggleMenu = () => {
        if (!menu?.isVisible() && game?.isVisible()) {
            menu?.show();
        } else {
            menu?.hide();
            game?.focus();
        }
    };
    const binds: [string, () => void][] = [
        ['Esc', () => game?.webContents.send('esc')],
        ['F3', () => game?.webContents.send('quick-search')],
        ['F4', () => void game?.loadURL(GAME_URL, NO_CACHE)],
        ['F5', () => game?.reload()],
        ['F11', () => game?.setFullScreen(!game.isFullScreen())],
        ['Alt+F4', () => app.quit()],
        [config.tools_keybind, toggleMenu],
    ];
    for (const [key, fn] of binds) {
        const [err] = tryCatch(() => localshortcut.register(key, fn));
        if (err) {
            console.log('Invalid Keybind', key);
            store.set('tools_keybind', 'Tab');
            localshortcut.register('Tab', fn);
        }
    }
};

const relaunch = () => {
    app.relaunch();
    app.quit();
};

ipcMain.on('config:get', (e) => {
    const init: Init = { config: readConfig(), version: app.getVersion() };
    e.returnValue = init;
});

ipcMain.on('config:set', (e, key: unknown, val: unknown) => {
    if (!isFrom(e, menu) || typeof key !== 'string' || !(key in CONFIG_DEFAULTS)) {
        return;
    }
    const k = key as ConfigKey;
    if (typeof val !== typeof CONFIG_DEFAULTS[k]) {
        return;
    }
    store.set(k, val);
    game?.webContents.send('config', k, val);
});

ipcMain.on('action', (e, action: Action) => {
    if (!isFrom(e, menu)) {
        return;
    }
    if (action === 'reboot') {
        relaunch();
    } else if (action === 'reset') {
        store.clear();
        relaunch();
    } else if (action === 'search') {
        game?.webContents.send('quick-search');
    }
});

ipcMain.handle('open-folder', async (e) => {
    if (!isFrom(e, menu)) {
        return;
    }
    const opts = { properties: ['openDirectory' as const] };
    const res = await (menu ? dialog.showOpenDialog(menu, opts) : dialog.showOpenDialog(opts));
    return res.canceled ? undefined : res.filePaths[0]?.replace(/\\/g, '/');
});

ipcMain.on('search-status', (e, msg: string, status: Status, alert?: string) => {
    if (isFrom(e, game)) {
        menu?.webContents.send('search-status', msg, status, alert);
    }
});

let promptResponse: string | null = null;
ipcMain.on('prompt', (e, text: unknown) => {
    if (!isFrom(e, game)) {
        e.returnValue = null;
        return;
    }
    promptResponse = null;
    const win = uiWindow('prompt', { width: 300, height: 157, alwaysOnTop: true, center: true });
    win.webContents.on('did-finish-load', () => {
        win.show();
        devTools(win);
        win.webContents.send('prompt', String(text));
    });
    win.on('closed', () => {
        e.returnValue = promptResponse;
        prompt = null;
    });
    prompt = win;
});
ipcMain.on('prompt:response', (e, val: unknown) => {
    if (isFrom(e, prompt)) {
        promptResponse = typeof val === 'string' && val !== '' ? val : null;
    }
});
ipcMain.on('prompt:resize', (e, height: unknown) => {
    if (isFrom(e, prompt) && prompt && typeof height === 'number') {
        prompt.setBounds({ ...prompt.getBounds(), height: Math.ceil(height) });
    }
});

DiscordRPC.register(CLIENT_ID);
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

// setActivity rejects while discord is closed, which is expected
const setActivity = (activity: DiscordRPC.Presence) => void rpc.setActivity(activity).catch(() => undefined);

ipcMain.on('game-info', (e, info: GameInfo) => {
    if (!isFrom(e, game)) {
        return;
    }
    const [min = 0, sec = 0] = String(info.time).split(':').map(Number);
    setActivity({
        details: String(info.map).split('_')[1],
        state: `Playing ${info.mode}`,
        largeImageKey: 'logo',
        largeImageText: String(info.username),
        smallImageKey: String(info.class).replace(/\s/g, '_').toLowerCase(),
        smallImageText: String(info.class),
        endTimestamp: new Date(Date.now() + (min * 60 + sec) * 1000),
        partyId: 'krunker',
        joinSecret: game?.webContents.getURL() ?? GAME_URL,
    });
});

ipcMain.on('activity', (e, activity: Activity) => {
    if (!isFrom(e, game) || !ACTIVITIES.includes(activity)) {
        return;
    }
    setActivity({
        state: activity[0]?.toUpperCase() + activity.slice(1),
        largeImageKey: 'logo',
        startTimestamp: new Date(),
    });
});

rpc.on('ready', () => {
    rpc.subscribe('ACTIVITY_JOIN', ({ secret }: { secret: string }) => {
        // the join secret comes from other discord users, so only krunker game links are accepted
        if (pageType(secret) === 'game') {
            void game?.loadURL(secret, NO_CACHE);
        }
    }).catch(console.error);
});
rpc.login({ clientId: CLIENT_ID }).catch(console.error);

app.on('ready', () => {
    // mac needs an app menu for standard shortcuts, other platforms would show it as a menu bar.
    // it must be set before any window exists, later windows keep electron's default menu
    Menu.setApplicationMenu(
        process.platform !== 'darwin'
            ? null
            : Menu.buildFromTemplate([
                  { label: 'Application', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] },
                  {
                      label: 'Edit',
                      submenu: [
                          { role: 'undo' },
                          { role: 'redo' },
                          { type: 'separator' },
                          { role: 'cut' },
                          { role: 'copy' },
                          { role: 'paste' },
                          { role: 'selectAll' },
                      ],
                  },
              ]),
    );
    createSplash();
});
app.on('activate', () => {
    if (!splash && !game) {
        createSplash();
    }
});
app.on('window-all-closed', () => app.quit());
app.on('web-contents-created', (_, contents) => contents.on('will-attach-webview', (e) => e.preventDefault()));
