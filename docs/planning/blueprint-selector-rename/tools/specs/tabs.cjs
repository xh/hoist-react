// TabList, TabSwitcher and DynamicTabSwitcher - Hoist's own markup, with Blueprint's class names
// until now.
module.exports = {
    anchors: {
        'bp6-tabs': {'bp6-tabs': '.xh-tab-list', 'bp6-vertical': '.xh-tab-list--vertical', 'bp6-large': null, 'bp6-fill': null},
        'bp6-tab-list': {'bp6-tab-list': '.xh-tab-list__tabs', 'bp6-fill': null},
        'bp6-tab': {'bp6-tab': '.xh-tab-list__tab', 'bp6-active': null},
        'bp6-tab-indicator-wrapper': {'bp6-tab-indicator-wrapper': '.xh-tab-list__indicator-wrapper'},
        'bp6-tab-indicator': {'bp6-tab-indicator': '.xh-tab-list__indicator'},
        // Hoist renders no Blueprint tab panel.
        'bp6-tab-panel': {'bp6-tab-panel': null},
        'bp6-tab-icon': {'bp6-tab-icon': null},
        'bp6-tab-tag': {'bp6-tab-tag': null}
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        '[data-bp-color-scheme=dark]': null,
        'bp6-vertical': '.xh-tab-list--vertical',
        'bp6-large': null,
        'bp6-fill': null,
        'bp6-navbar': null,
        'bp6-icon': null,
        'bp6-icon-standard': null,
        'bp6-icon-large': null,
        'bp6-tag': null,
        'bp6-text-overflow-ellipsis': null,
        'bp6-flex-expander': null
    }
};
