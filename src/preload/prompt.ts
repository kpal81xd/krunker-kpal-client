import { ipcRenderer } from 'electron';

import { applyTheme, PROMPT_THEME } from '../theme';
import type { Init } from '../types';

import { byId } from './dom';

const { config } = ipcRenderer.sendSync('config:get') as Init;

ipcRenderer.on('prompt', (_, text: string) => {
    byId('promptText').innerText = text;
    byId('promptInput').focus();
    ipcRenderer.send('prompt:resize', byId('promptMenu').getBoundingClientRect().height + 7);
});

window.addEventListener('load', () => config.tools_theme && applyTheme(document.styleSheets[0], PROMPT_THEME));

document.addEventListener('DOMContentLoaded', () => {
    byId('submit').onclick = () => {
        ipcRenderer.send('prompt:response', byId<HTMLInputElement>('promptInput').value);
        window.close();
    };
    byId('cancel').onclick = () => window.close();
});
