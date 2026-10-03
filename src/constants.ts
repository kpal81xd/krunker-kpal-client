export const GAME_URL = 'https://krunker.io';
export const MATCHMAKER_URL = 'https://matchmaker.krunker.io/game-list';
export const CLIENT_ID = '566623836628582412';
export const NO_CACHE = { extraHeaders: 'pragma: no-cache\n' };
export const SEARCH_RETRY_MS = 1000;
export const RESTART_MSG = 'Changes will be made on restart';

export const PROMPT_ATTR = 'data-kpal-prompt';
export const PROMPT_EVENT = 'kpal-prompt';
export const FPS_ATTR = 'data-kpal-fps';

/** keys keep the legacy `tools_` prefix so existing installs keep their settings */
export const CONFIG_DEFAULTS = {
    tools_keybind: 'Tab',
    tools_theme: false,
    tools_vsync: false,
    tools_fpsCapSlider: 0,
    tools_d3d9: false,
    tools_colorProfile: 'default',
    tools_autoSearch: false,
    tools_region: 'any',
    tools_mode: 'any',
    tools_map: 'any',
    tools_type: 'any',
    tools_minPlayersSlider: 0,
    tools_maxPlayersSlider: 8,
    tools_customModels: false,
    tools_folderModels: '',
};

export const STATUS_COLORS = { good: 'green', neutral: 'orange', bad: 'red' };

export const PROFILES = [
    ['default', 'Default'],
    ['srgb', 'sRGB'],
    ['generic-rgb', 'Generic RGB'],
    ['color-spin-gamma24', 'Color spin with gamma 2.4'],
] as const;

export const REGIONS = [
    ['de-fra', 'FRA'],
    ['us-fl', 'MIA'],
    ['us-ca-sv', 'SV'],
    ['us-nj', 'NY'],
    ['sgp', 'SIN'],
    ['jb-hnd', 'TOK'],
    ['au-syd', 'SYD'],
] as const;

export const MODES = [
    ['ctf', 'CTF'],
    ['ffa', 'FFA'],
    ['tdm', 'TDM'],
    ['point', 'POINT'],
    ['king', 'KING'],
] as const;

export const MAPS = [
    'Burg',
    'Littletown',
    'Sandstorm',
    'Subzero',
    'Undergrowth',
    'Freight',
    'Shipyard',
    'Citadel',
    'Lostworld',
].map((m) => [m, m] as const);

export const TYPES = [
    ['public', 'Public'],
    ['custom', 'Custom'],
] as const;

export const ACTIVITIES = ['idle', 'social', 'editor', 'viewer'] as const;
