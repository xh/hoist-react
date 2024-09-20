import {div, filler, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {PersistenceManagerModel} from '@xh/hoist/desktop/cmp/persistenceManager';
import {PersistenceViewTree} from '@xh/hoist/desktop/cmp/persistenceManager/Types';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {consumeEvent, pluralize} from '@xh/hoist/utils/js';
import {capitalize, isEmpty} from 'lodash';
import {ReactNode} from 'react';

export interface PersistenceMenuProps extends HoistProps<PersistenceManagerModel> {
    /** True to disable options for saving/managing items. */
    minimal?: boolean;
    /** True (default) to render a save button alongside the primary menu button when dirty. */
    omitTopLevelSaveButton?: boolean;
    /** True to omit the default menu component. Should be used when creating custom app-specific component */
    omitDefaultMenuComponent?: boolean;
}

export const [PersistenceMenu, persistenceMenu] = hoistCmp.withFactory<PersistenceMenuProps>({
    displayName: 'PersistenceMenu',
    className: 'xh-persistence-manager__menu',
    model: uses(PersistenceManagerModel),

    render({
        model,
        omitDefaultMenuComponent = false,
        minimal = false,
        omitTopLevelSaveButton = true
    }) {
        if (omitDefaultMenuComponent) return null;
        const {selectedView, isShared, entity} = model,
            displayName = entity.displayName;
        return hbox({
            className: 'xh-persistence-manager__menu',
            items: [
                popover({
                    item: button({
                        text:
                            model.getHierarchyDisplayName(selectedView?.name) ??
                            `Default ${capitalize(displayName)}`,
                        icon: isShared ? Icon.users() : Icon.bookmark(),
                        rightIcon: Icon.chevronDown(),
                        outlined: true
                    }),
                    content: div(
                        div({
                            className: 'xh-popup__title',
                            item: capitalize(pluralize(displayName))
                        }),
                        objMenu({minimal})
                    ),
                    placement: 'bottom-start'
                }),
                saveButton({omit: !omitTopLevelSaveButton || !model.canSave})
            ]
        });
    }
});

const menuFavorite = hoistCmp.factory<PersistenceManagerModel>({
    render({model, view}) {
        const isFavorite = model.isFavorite(view.id);
        return hbox({
            alignItems: 'center',
            items: [
                span({style: {paddingRight: 5}, item: view.text}),
                filler(),
                div({
                    className: `xh-persistence-manager__menu-item-fav ${isFavorite ? 'xh-persistence-manager__menu-item-fav--active' : ''}`,
                    item: Icon.favorite({
                        prefix: isFavorite ? 'fas' : 'far'
                    }),
                    onClick: e => {
                        consumeEvent(e);
                        model.toggleFavorite(view.id);
                    }
                })
            ]
        });
    }
});

const saveButton = hoistCmp.factory<PersistenceMenuProps>({
    render({model}) {
        return button({
            icon: Icon.save(),
            tooltip: `Save changes to this ${model.entity.displayName}`,
            intent: 'primary',
            onClick: () => model.saveAsync(false).linkTo(model.loadModel)
        });
    }
});

const objMenu = hoistCmp.factory<PersistenceMenuProps>({
    render({model, minimal}) {
        const {entity} = model,
            items = [];

        if (!isEmpty(model.favoritedViews)) {
            items.push(menuDivider({title: 'Favorites'}));
            items.push(
                ...model.favoritedViews.map(it => {
                    return menuItem({
                        key: `${it.id}-isFavorite`,
                        icon: model.selectedId === it.id ? Icon.check() : Icon.placeholder(),
                        text: menuFavorite({
                            view: {...it, text: model.getHierarchyDisplayName(it.name)}
                        }),
                        onClick: () => model.selectAsync(it.id).linkTo(model.loadModel)
                    });
                })
            );
        }
        if (!isEmpty(model.privateViewTree)) {
            items.push(menuDivider({title: `My ${pluralize(entity.displayName)}`}));
            model.privateViewTree.forEach(it => {
                items.push(buildView(it, model));
            });
        }
        if (!isEmpty(model.sharedViewTree)) {
            items.push(menuDivider({title: `Shared ${pluralize(entity.displayName)}`}));
            model.sharedViewTree.forEach(it => {
                items.push(buildView(it, model));
            });
        }

        if (minimal) return menu({items});
        return menu({
            items: [
                ...items,
                menuDivider({omit: !model.enableDefault || isEmpty(items)}),
                menuItem({
                    icon: model.selectedId ? Icon.placeholder() : Icon.check(),
                    text: `Default ${capitalize(entity.displayName)}`,
                    omit: !model.enableDefault,
                    onClick: () => model.selectAsync(null)
                }),
                menuDivider({omit: !model.enableDefault}),
                menuItem({
                    icon: Icon.save(),
                    text: 'Save',
                    disabled: !model.canSave,
                    onClick: () => model.saveAsync(false)
                }),
                menuItem({
                    icon: Icon.copy(),
                    text: 'Save as...',
                    onClick: () => model.saveAsAsync()
                }),
                menuItem({
                    icon: Icon.reset(),
                    text: `Revert ${capitalize(entity.displayName)}`,
                    disabled: !model.isDirty,
                    onClick: () => model.resetAsync()
                }),
                menuDivider(),
                menuItem({
                    icon: Icon.gear(),
                    disabled: isEmpty(model.views),
                    text: `Manage ${pluralize(entity.displayName)}...`,
                    onClick: () => model.openManageDialog()
                })
            ]
        });
    }
});

function buildView(view: PersistenceViewTree, model: PersistenceManagerModel): ReactNode {
    const {type, text, selected} = view,
        icon = selected ? Icon.check() : Icon.placeholder();
    switch (type) {
        case 'directory':
            return menuItem({
                text,
                icon,
                shouldDismissPopover: false,
                children: view.items ? view.items.map(child => buildView(child, model)) : []
            });
        case 'view':
            return menuItem({
                className: 'xh-persistence-manager__menu-item',
                key: view.id,
                icon,
                text: menuFavorite({model, view}),
                onClick: () => model.selectAsync(view.id).linkTo(model.loadModel)
            });
    }
}
