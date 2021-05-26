import {div, filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroupInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import './FilterPopover.scss';

export const filterPopover = hoistCmp.factory({
    render({model}) {
        const {isOpen, isFiltered} = model;

        return popover({
            className: 'xh-grid-header-menu-icon',
            position: 'bottom',
            boundary: 'viewport',
            hasBackdrop: true,
            interactionKind: 'click',
            isOpen,
            onInteraction: (open) => {
                if (!open) model.cancel();
            },
            target: div({
                item: isFiltered ? Icon.filter() : Icon.bars(),
                onClick: (e) => {
                    e.stopPropagation();
                    model.openMenu();
                }
            }),
            content: content()
        });
    }
});

const content = hoistCmp.factory({
    render({model}) {
        const {xhColumn} = model;
        return panel({
            className: 'filter-popover',
            onClick: (e) => e.stopPropagation(),
            compactHeader: true,
            title: `Filter ${xhColumn.displayName} by:`,
            headerItems: [switcher()],
            item: tabContainer(),
            tbar: tbar(),
            bbar: bbar()
        });
    }
});

const tbar = hoistCmp.factory({
    render({model}) {
        const {enumFilterModel, colId, enumTabActive} = model;
        return toolbar({
            omit: !enumTabActive,
            compact: true,
            item: storeFilterField({
                model: model,
                bind: 'filterText',
                icon: null,
                flex: 1,
                store: enumFilterModel.gridModel.store,
                includeFields: [colId]
            })
        });
    }
});

const bbar = hoistCmp.factory({
    render({model}) {
        return toolbar({
            compact: true,
            items: [
                button({
                    icon: Icon.undo(),
                    text: 'Reset',
                    intent: 'danger',
                    onClick: () => model.reset()
                }),
                filler(),
                button({
                    text: 'Cancel',
                    onClick: () => model.cancel()
                }),
                button({
                    icon: Icon.check(),
                    text: 'Apply',
                    intent: 'success',
                    onClick: () => model.commit()
                })
            ]
        });
    }
});

const switcher = hoistCmp.factory({
    render({model}) {
        return buttonGroupInput({
            className: 'filter-popover__tab-switcher',
            omit: model.type === 'bool',
            intent: 'primary',
            bind: 'tabId',
            items: [
                button({
                    className: 'filter-popover__tab-switcher--button',
                    value: 'enumFilter',
                    text: 'Values'
                }),
                button({
                    className: 'filter-popover__tab-switcher--button',
                    value: 'customFilter',
                    text: 'Custom'
                })
            ]
        });
    }
});
