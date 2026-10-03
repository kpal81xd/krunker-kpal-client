import { clipboard, ipcRenderer } from 'electron';

import { GAME_URL, MAPS, MODES, PROFILES, REGIONS, RESTART_MSG, STATUS_COLORS, TYPES } from '../constants';
import { applyTheme, GAME_THEME } from '../theme';
import type { Action, Config, ConfigKey, Init, Status } from '../types';

import { byId, h } from './dom';

type Options = readonly (readonly [string, string])[];

const { config } = ipcRenderer.sendSync('config:get') as Init;

const set = (key: ConfigKey, val: Config[ConfigKey], restart = false) => {
    Object.assign(config, { [key]: val });
    ipcRenderer.send('config:set', key, val);
    if (restart) {
        alert(RESTART_MSG);
    }
};
const action = (name: Action) => ipcRenderer.send('action', name);

const LINK = 'font-size: 20px';
const BUTTON = 'font-size: 20px; float: right; margin-left: 8px';

const header = (name: string) => h('div', { className: 'setHed' }, name);
const row = (name: string, ...children: Node[]) => h('div', { className: 'settName' }, name, ...children);

const toggle = (name: string, key: 'tools_theme' | 'tools_vsync' | 'tools_d3d9' | 'tools_autoSearch', restart = true) =>
    row(
        name,
        h(
            'label',
            { className: 'switch', css: restart ? 'margin-left: 8px' : '' },
            h('input', { type: 'checkbox', checked: config[key], onchange: (e) => set(key, check(e), restart) }),
            h('span', { className: 'slider' }),
        ),
    );

const check = (e: Event) => (e.target as HTMLInputElement).checked;

const slider = (
    name: string,
    key: 'tools_fpsCapSlider' | 'tools_minPlayersSlider' | 'tools_maxPlayersSlider',
    max: number,
    step: number,
) => {
    const range = { min: '0', max: String(max), value: String(config[key]) };
    const num = h('input', { type: 'number', className: 'sliderVal', ...range });
    const bar = h('input', { type: 'range', className: 'sliderM', step: String(step), ...range });
    const sync = (from: HTMLInputElement, to: HTMLInputElement) => () => {
        to.value = from.value;
        set(key, Number(from.value) || 0);
    };
    num.oninput = sync(num, bar);
    bar.oninput = sync(bar, num);
    return row(name, num, h('div', { className: 'slidecontainer' }, bar));
};

const select = (key: ConfigKey, options: Options, onchange: (val: string) => void, placeholder?: string) =>
    h(
        'select',
        { onchange: (e) => onchange((e.target as HTMLSelectElement).value) },
        ...(placeholder ? [['any', placeholder] as const, ...options] : options).map(([value, label]) =>
            h('option', { value, selected: config[key] === value }, label),
        ),
    );

const filter = (key: 'tools_region' | 'tools_mode' | 'tools_map' | 'tools_type', options: Options, label: string) =>
    select(key, options, (val) => set(key, val), label);

const build = () => {
    const keybind = h('input', {
        type: 'text',
        placeholder: 'Key Bind',
        value: config.tools_keybind,
        css: 'width: 100px',
    });
    const folder = h('input', {
        type: 'text',
        placeholder: 'Model Path',
        value: config.tools_folderModels,
        oninput: () => set('tools_folderModels', folder.value),
    });
    const folderRow = row(
        'Folder',
        h(
            'a',
            {
                css: BUTTON,
                onclick: () =>
                    void (ipcRenderer.invoke('open-folder') as Promise<string | undefined>).then((path) => {
                        if (path) {
                            folder.value = path;
                            set('tools_folderModels', path);
                        }
                    }),
            },
            'Import',
        ),
        folder,
    );
    folderRow.classList.add('indent');
    folderRow.style.display = config.tools_customModels ? 'block' : 'none';

    return [
        row(
            '',
            h('a', {}, ' '),
            h(
                'a',
                {
                    css: LINK,
                    onclick: () => {
                        if (confirm('Are you sure you want to clear all client settings?')) {
                            alert('Settings Cleared! Client will now restart');
                            action('reset');
                        }
                    },
                },
                'Reset All',
            ),
            h('span', { css: 'padding-left: 5px; padding-right: 5px' }, ' | '),
            h(
                'a',
                {
                    css: LINK,
                    onclick: () => {
                        alert('Client will now restart');
                        action('reboot');
                    },
                },
                'Reboot',
            ),
        ),

        header('Game'),
        row(
            'URL',
            h(
                'a',
                {
                    id: 'serverURL',
                    className: 'label',
                    css: 'color: green',
                    onclick: (e) => clipboard.writeText((e.target as HTMLElement).innerText),
                },
                GAME_URL,
            ),
        ),

        header('Client'),
        row(
            'Key Bind',
            h('a', { css: BUTTON, onclick: () => set('tools_keybind', keybind.value, true) }, 'Set'),
            keybind,
        ),
        toggle('KPal Theme', 'tools_theme'),
        toggle('Frame Rate Limit', 'tools_vsync'),
        slider('Frame Rate Cap', 'tools_fpsCapSlider', 1200, 10),
        toggle('DX9 Rendering', 'tools_d3d9'),
        row(
            'Color Profile',
            select('tools_colorProfile', PROFILES, (val) => set('tools_colorProfile', val, true)),
        ),

        header('Match Making'),
        toggle('Auto-Search', 'tools_autoSearch', false),
        row(
            'Filters',
            filter('tools_region', REGIONS, 'Region'),
            filter('tools_mode', MODES, 'Mode'),
            filter('tools_map', MAPS, 'Map'),
            filter('tools_type', TYPES, 'Type'),
        ),
        slider('Min Players', 'tools_minPlayersSlider', 8, 1),
        slider('Max Players', 'tools_maxPlayersSlider', 8, 1),
        row(
            '',
            h('a', { id: 'searchMatchStatus', css: `${LINK}; text-decoration: none; color: orange` }, ' '),
            h('a', { css: 'float: right; font-size: 20px', onclick: () => action('search') }, 'Search'),
        ),

        h('br'),
        header('Modding'),
        row(
            'Custom Models',
            h(
                'label',
                { className: 'switch', css: 'margin-left: 8px' },
                h('input', {
                    type: 'checkbox',
                    checked: config.tools_customModels,
                    onchange: (e) => {
                        set('tools_customModels', check(e), true);
                        folderRow.style.display = check(e) ? 'block' : 'none';
                    },
                }),
                h('span', { className: 'slider' }),
            ),
        ),
        folderRow,
    ];
};

// these can arrive before the menu is built, so missing elements are skipped
ipcRenderer.on('game-url', (_, url: string) => {
    const el = document.getElementById('serverURL');
    if (el) {
        el.innerText = url;
    }
});
ipcRenderer.on('search-status', (_, msg: string, state: Status, alertMsg?: string) => {
    const el = document.getElementById('searchMatchStatus');
    if (el) {
        el.style.color = STATUS_COLORS[state];
        el.innerText = msg;
    }
    if (alertMsg) {
        alert(alertMsg);
    }
});

document.addEventListener('DOMContentLoaded', () => byId('page').append(...build()));

// the stylesheet is only guaranteed to be parsed once the page has loaded
window.addEventListener('load', () => config.tools_theme && applyTheme(document.styleSheets[0], GAME_THEME));
