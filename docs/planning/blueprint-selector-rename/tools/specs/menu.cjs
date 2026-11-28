// Menu, MenuItem, MenuDivider and the submenu and context-menu popovers.
const intents = ['primary', 'success', 'warning', 'danger'];
const anyIntent = `:is(${intents.map(i => `.xh-menu-item--intent-${i}`).join(', ')})`;
const item = {
    'bp6-menu-item': '.xh-menu-item',
    'bp6-active': '.xh-menu-item--active',
    'bp6-disabled': '.xh-menu-item--disabled',
    'bp6-popover-dismiss': '.xh-popover-dismiss',
    '[class*=bp6-intent-]': anyIntent,
    // Not rendered by Hoist's menu items.
    'bp6-selected': null,
    'bp6-menu-item-is-selectable': null,
    'bp6-large': null,
    'bp6-small': null
};
intents.forEach(i => (item[`bp6-intent-${i}`] = `.xh-menu-item--intent-${i}`));
module.exports = {
    anchors: {
        'bp6-menu': {'bp6-menu': '.xh-menu-list', 'bp6-large': null, 'bp6-small': null},
        'bp6-menu-item': item,
        'bp6-menu-item-icon': {'bp6-menu-item-icon': '.xh-menu-item__icon'},
        'bp6-menu-item-label': {'bp6-menu-item-label': '.xh-menu-item__label'},
        'bp6-menu-item-selected-icon': {'bp6-menu-item-selected-icon': null},
        'bp6-submenu-icon': {'bp6-submenu-icon': '.xh-menu-item__submenu-icon'},
        'bp6-menu-header': {'bp6-menu-header': '.xh-menu-header', 'bp6-large': null},
        'bp6-menu-divider': {'bp6-menu-divider': '.xh-menu-divider'},
        'bp6-context-menu-popover': {'bp6-context-menu-popover': '.xh-context-menu'},
        'bp6-context-menu-backdrop': {'bp6-context-menu-backdrop': '.xh-context-menu__backdrop'}
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        // On a popover, bp6-submenu marks the submenu's panel. Elsewhere it marks the parent item's li.
        'bp6-submenu': cls =>
            cls.includes('bp6-popover') ? '.xh-menu__submenu' : '.xh-menu-item--submenu',
        // The xh-popover__* classes already sit beside these on the same elements.
        'bp6-popover': '.xh-popover__content-wrapper',
        'bp6-popover-content': '.xh-popover__content',
        'bp6-popover-target': '.xh-popover__target-wrapper',
        // Blueprint's open-parent highlight. Hoist highlights the parent item through
        // [aria-expanded] in its own color, which these rules would outrank.
        'bp6-popover-open': null,
        'bp6-popover-wrapper': null,
        'bp6-context-menu-virtual-target': null,
        'bp6-large': null,
        'bp6-small': null,
        'bp6-label': null,
        'bp6-text-muted': null,
        // Blueprint's menu rules use bp6-fill only for the item text.
        'bp6-fill': '.xh-menu-item__text'
    },
    // A menu heading wraps, as it always has in Hoist, rather than truncating to one line.
    dropDecls: {
        '.xh-menu-header': ['display', 'cursor'],
        '.xh-menu-header > h6': ['overflow', 'text-overflow', 'white-space', 'word-wrap']
    }
};
