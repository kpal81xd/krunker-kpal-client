import { ipcRenderer } from 'electron';

import type { Init } from '../types';

import { byId } from './dom';

const { config, version } = ipcRenderer.sendSync('config:get') as Init;

const MESSAGES: Record<string, (value?: number) => string> = {
    available: () => 'Downloading Update',
    progress: (value) => `Downloading ${value ?? 0}%`,
    none: () => 'Loading...',
    error: () => 'Update Failed',
};

ipcRenderer.on('update', (_, state: string, value?: number) => {
    byId('updateStatus').innerText = MESSAGES[state]?.(value) ?? '';
});

document.addEventListener('DOMContentLoaded', () => {
    byId('version').innerText = `v${version}`;
    if (config.tools_theme) {
        byId<HTMLImageElement>('logo').src = '../img/theme/img/logo_1.png';
        byId('updateStatus').style.color = '#a21dc3';
        byId('version').style.color = '#cc3636';
    }
});
