import { tryCatch } from './utils';

type Rule = [selector: string, property: string, value: string | null, priority?: string];
type Theme = { rules: Rule[]; inserts?: string[] };

const RED = '#ff4747';
const DARK = '#333';
const DARKER = '#222';

/** applied to both krunker's own stylesheet and the settings menu */
export const GAME_THEME: Theme = {
    rules: [
        ...['.button', '.buttonR', '.buttonG', '.buttonP'].flatMap((s): Rule[] => [
            [s, 'background-color', DARK],
            [s, 'box-shadow', `inset 0 -7px 0 0 ${DARKER}`],
        ]),
        ['.button', 'color', RED],
        ['.buttonR', 'color', '#ff47b7', 'important'],
        ['.buttonP', 'color', '#b447ff', 'important'],

        ...[
            '.sliderVal',
            'input:checked + .slider',
            '.sliderM::-webkit-slider-thumb',
            '.hostPresetBtn',
            '.mapLoadButton',
            '.xpBarB',
            '.accountButton',
            '.joinQueue',
            '.quickJoin',
        ].map((s): Rule => [s, 'background-color', RED]),
        ...['.terms', 'a', 'a:visited', '.strmViews'].map((s): Rule => [s, 'color', RED]),
        ['.button.btnRespin', 'color', '#ff47b7', 'important'],
        ['.button.btnRespin', 'background-color', DARK],
        ['.joinQueue', 'box-shadow', 'inset 0 -7px 0 0 #cf3c3c'],
        ['.joinQueue:hover', 'box-shadow', 'inset 0 -7px 0 0 #cf3c3c'],

        ['.headerBar div', 'color', null],
        ['.menuItem:hover', 'background', RED],
        ['#serverSearch, #settingSearch', 'background-color', DARK],
        ['.settingsHeader', 'background-color', DARK],
        ['.serverHeader', 'background-color', DARK],

        ['#page', 'background-color', DARK],
        ['#menuWindow', 'background-color', DARK],
        ['#menuWindow', 'box-shadow', `${DARKER} 0px 9px 0px 0px`],
        ['#bodyBorder', 'border', '8px solid #242424'],
        ['.settName', 'color', 'rgba(255,255,255,.5)'],
        ['.settName, .settNameSmall', 'color', 'rgba(255,255,255,.5)'],
        ['.b', 'color', 'rgba(255,255,255,.8)'],
        ['*', 'color', '#eee'],
        ['input', 'background-color', DARKER, 'important'],
        ['input', 'border-color', DARKER, 'important'],
        ['.inputGrey2', 'background', DARKER],
        ['.inputGrey', 'background', DARKER],
        ['.formInput', 'background', DARKER],
        ['::-webkit-scrollbar', 'background-color', null],
        ['::-webkit-scrollbar-track', 'background-color', DARKER],
        ['::-webkit-scrollbar-thumb', 'background-color', '#444'],
        ['.slider', 'background-color', DARKER],
        ['.hostToggle', 'background', RED],
    ],
    inserts: [
        '::placeholder { color: rgba(255, 255, 255, 0.2) }',
        `#presetSelect { background-color: ${DARKER} !important }`,
    ],
};

export const PROMPT_THEME: Theme = {
    rules: [
        ['#promptMenu', 'background-color', DARK],
        ['#promptMenu', 'box-shadow', `${DARKER} 0px 9px 0px 0px`],
        ['.actionButton', 'background-color', RED],
        ['*', 'color', '#eee'],
        ['input', 'background-color', DARKER],
        ['input', 'border-color', DARKER],
    ],
};

/** edits matching rules in place so the theme keeps each selector's original specificity */
export const applyTheme = (sheet: CSSStyleSheet | undefined, { rules, inserts = [] }: Theme) => {
    // cross-origin sheets throw on cssRules access
    const [err, list] = tryCatch(() => [...(sheet?.cssRules ?? [])]);
    if (err || !sheet) {
        return;
    }
    const styles = list.filter((r): r is CSSStyleRule => 'selectorText' in r);
    for (const [selector, property, value, priority] of rules) {
        styles.find((r) => r.selectorText === selector)?.style.setProperty(property, value, priority);
    }
    for (const rule of inserts) {
        sheet.insertRule(rule, 0);
    }
};
