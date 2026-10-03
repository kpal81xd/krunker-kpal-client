import { ipcRenderer, webFrame } from 'electron';

import { FPS_ATTR, GAME_URL, MATCHMAKER_URL, PROMPT_ATTR, PROMPT_EVENT, SEARCH_RETRY_MS } from '../constants';
import { applyTheme, GAME_THEME } from '../theme';
import type { ConfigKey, Game, GameInfo, Init, Status } from '../types';
import { pageType } from '../utils';

const { config, version } = ipcRenderer.sendSync('config:get') as Init;
const root = () => document.documentElement;

/** runs code in the page's own world, which this isolated preload cannot touch directly */
const inject = (code: string) => void webFrame.executeJavaScript(code);

inject('window.OffCliV = true');

// the page world has no ipc access, so prompt text and replies cross over a shared dom attribute
const PROMPT_BRIDGE = `
    window.prompt = (text) => {
        const el = document.documentElement;
        el.setAttribute('${PROMPT_ATTR}', String(text));
        document.dispatchEvent(new Event('${PROMPT_EVENT}'));
        const res = el.getAttribute('${PROMPT_ATTR}');
        el.removeAttribute('${PROMPT_ATTR}');
        return res;
    };
`;
document.addEventListener(PROMPT_EVENT, () => {
    const res = ipcRenderer.sendSync('prompt', root().getAttribute(PROMPT_ATTR)) as string | null;
    if (res === null) {
        root().removeAttribute(PROMPT_ATTR);
    } else {
        root().setAttribute(PROMPT_ATTR, res);
    }
});

localStorage.setItem('cont_listKey', '113');

const setFpsCap = (fps: number) => root().setAttribute(FPS_ATTR, String(fps < 10 ? 0 : 1000 / fps));

const status = (msg: string, state: Status, alert?: string) => ipcRenderer.send('search-status', msg, state, alert);

const searchMatch = () => {
    const { tools_region: region, tools_mode: mode, tools_map: map, tools_type: type } = config;
    status('Searching...', 'neutral');
    fetch(`${MATCHMAKER_URL}?hostname=${location.hostname}`)
        .then((res) => res.json() as Promise<{ games: Game[] }>)
        .then(({ games }) => {
            const matches = games.filter(
                ([, reg, players, , info]) =>
                    (region === 'any' || reg === region) &&
                    players >= config.tools_minPlayersSlider &&
                    players <= config.tools_maxPlayersSlider &&
                    (mode === 'any' || info.i.includes(mode)) &&
                    (map === 'any' || info.i.includes(map)) &&
                    (type === 'any' || info.cs === (type === 'custom')),
            );
            const match = matches[Math.floor(Math.random() * matches.length)];
            if (match) {
                status('Match Found', 'good');
                location.href = `${GAME_URL}/?game=${match[0]}&n=${Date.now()}`;
            } else if (config.tools_autoSearch) {
                status('No Matches Found', 'bad');
                setTimeout(searchMatch, SEARCH_RETRY_MS);
            } else {
                status('No Matches Found', 'bad', 'No Matches Found :(');
            }
        })
        .catch((e: unknown) => {
            console.error(e);
            status('Search Failed', 'bad');
        });
};

const observe = (id: string, opts: MutationObserverInit, cb: (el: HTMLElement) => void) => {
    const el = document.getElementById(id);
    if (el) {
        new MutationObserver(() => cb(el)).observe(el, opts);
    }
};
const text = (id: string) => document.getElementById(id)?.innerText ?? '';
const STYLE = { attributes: true, attributeFilter: ['style'] };
const CHILDREN = { childList: true };

const initGame = () => {
    document.querySelectorAll<HTMLElement>('.menuItemIcon').forEach((el) => (el.style.height = '60px'));

    const mark = document.createElement('div');
    mark.innerText = `Krunker Client v${version}`;
    mark.style.cssText = `font-size: 8pt; color: black; opacity: 0.1; background-color: white; z-index: 1000;
        bottom: 0; right: 0; margin: auto; position: absolute;`;
    document.body.appendChild(mark);

    // busy-waits inside requestAnimationFrame to hold the page under the configured frame rate
    setFpsCap(config.tools_fpsCapSlider);
    inject(`(() => {
        const raf = window.requestAnimationFrame.bind(window);
        let start = 0;
        window.requestAnimationFrame = (cb) => {
            const limit = Number(document.documentElement.getAttribute('${FPS_ATTR}')) || 0;
            while (performance.now() - start < limit);
            start = performance.now();
            return raf(cb);
        };
    })()`);

    if (config.tools_theme) {
        applyTheme(document.styleSheets[0], GAME_THEME);
    }
    status(' ', 'neutral');

    observe('inGameUI', STYLE, (el) => {
        if (el.style.display === 'block') {
            const info: GameInfo = {
                username: localStorage.getItem('krunker_username') ?? 'Guest',
                class: text('menuClassName'),
                mode: text('curGameInfo').split('on')[0] ?? '',
                map: text('mapInfo'),
                time: text('timerVal'),
            };
            ipcRenderer.send('game-info', info);
        }
    });
    observe('endUI', STYLE, (el) => el.style.display !== 'none' && ipcRenderer.send('activity', 'idle'));
    observe('instructions', CHILDREN, (el) => {
        if (config.tools_autoSearch && /Game is full\.|NoAvailableServers/.test(el.innerText)) {
            searchMatch();
        }
    });
    observe('endTimer', CHILDREN, (el) => config.tools_autoSearch && el.innerText.endsWith('01') && searchMatch());
};

ipcRenderer.on('esc', () => document.exitPointerLock());
ipcRenderer.on('quick-search', searchMatch);
ipcRenderer.on('config', <K extends ConfigKey>(_: unknown, key: K, val: (typeof config)[K]) => {
    config[key] = val;
    if (key === 'tools_fpsCapSlider') {
        setFpsCap(config.tools_fpsCapSlider);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // electron installs its own prompt stub after the preload runs, so the bridge goes in once the page has parsed
    inject(PROMPT_BRIDGE);

    const type = pageType(location.href);
    if (!type) {
        return;
    }
    ipcRenderer.send('activity', type === 'game' ? 'idle' : type);
    if (type === 'game') {
        initGame();
    } else {
        inject('window.onbeforeunload = null');
    }
});
