import type { ACTIVITIES, CONFIG_DEFAULTS, STATUS_COLORS } from './constants';

export type Config = typeof CONFIG_DEFAULTS;
export type ConfigKey = keyof Config;
export type Init = { config: Config; version: string };
export type Status = keyof typeof STATUS_COLORS;
export type Activity = (typeof ACTIVITIES)[number];
export type Action = 'reboot' | 'reset' | 'search';
export type GameInfo = { username: string; class: string; mode: string; map: string; time: string };

/** matchmaker entry: [code, region, players, max, { i: "mode_map", cs: is_custom }] */
export type Game = [string, string, number, number, { i: string; cs: boolean }];
