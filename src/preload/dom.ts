type Tag = keyof HTMLElementTagNameMap;
type Props<K extends Tag> = Partial<HTMLElementTagNameMap[K]> & { css?: string };

/** builds elements from properties, never html strings, so values cannot inject markup */
export const h = <K extends Tag>(tag: K, { css, ...props }: Props<K> = {}, ...children: (Node | string)[]) => {
    const el = document.createElement(tag);
    Object.assign(el, props);
    if (css) {
        el.style.cssText = css;
    }
    el.append(...children);
    return el;
};

export const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
