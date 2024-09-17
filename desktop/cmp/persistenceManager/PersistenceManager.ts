import {div, fragment, hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {PersistenceViewTree} from '@xh/hoist/desktop/cmp/persistenceManager/Types';
import {Icon} from '@xh/hoist/icon/Icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {capitalize} from 'lodash';
import {ReactNode} from 'react';
import {manageDialog} from './impl/ManageDialog';
import {saveDialog} from './impl/SaveDialog';
import './PersistenceManager.scss';
import {PersistenceManagerModel} from './PersistenceManagerModel';
import {pluralize} from '@xh/hoist/utils/js';

interface PersistenceManagerProps extends HoistProps<PersistenceManagerModel> {
    /** True to disable options for saving/managing items. */
    minimal?: boolean;
    /** True (default) to render a save button alongside the primary menu button when dirty. */
    enableTopLevelSaveButton?: boolean;
    /** True to omit the default menu component. Should be used when creating custom app-specific component */
    omitDefaultMenuComponent?: boolean;
}

export const [PersistenceManager, persistenceManager] =
    hoistCmp.withFactory<PersistenceManagerProps>({
        displayName: 'PersistenceManager',
        model: uses(PersistenceManagerModel),

        render({model, ...props}) {
            return fragment(defaultMenu({...props}), manageDialog(), saveDialog());
        }
    });

//------------------------
// Implementation
//------------------------

const defaultMenu = hoistCmp.factory<PersistenceManagerModel>({
    render({
        model,
        omitDefaultMenuComponent = false,
        minimal = false,
        enableTopLevelSaveButton = true
    }) {
        const {selectedView, isShared, entity} = model,
            displayName = entity.displayName;
        return hbox({
            className: 'xh-persistence-manager',
            items: [
                popover({
                    omit: omitDefaultMenuComponent,
                    item: button({
                        text: model.getHierarchyDisplayName(selectedView?.name) ?? `-`,
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
                saveButton({omit: !enableTopLevelSaveButton || !model.canSave})
            ]
        });
    }
});

const saveButton = hoistCmp.factory<PersistenceManagerModel>({
    render({model}) {
        return button({
            icon: Icon.save(),
            tooltip: `Save changes to this ${model.entity.displayName}`,
            intent: 'primary',
            onClick: () => model.saveAsync(false).linkTo(model.loadModel)
        });
    }
});

const objMenu = hoistCmp.factory<PersistenceManagerProps>({
    render({model, minimal}) {
        const {loadModel, entity} = model,
            items = [];

        if (model.favoritedViews.length > 0) {
            items.push(menuDivider({title: 'Favorites'}));
            items.push(
                ...model.favoritedViews.map(it => {
                    return menuItem({
                        key: `${it.id}-isFavorite`,
                        icon: model.selectedId === it.id ? Icon.check() : Icon.placeholder(),
                        text: model.getHierarchyDisplayName(it.name),
                        onClick: () => model.selectAsync(it.id).linkTo(model.loadModel)
                    });
                })
            );
        }

        model.viewTree.forEach(it => {
            if (it.type === 'divider') items.push(menuDivider({title: it.text}));
            items.push(buildView(it, model));
        });

        if (minimal) return menu({items});
        return menu({
            items: [
                ...items,
                menuDivider(),
                menuItem({
                    icon: Icon.save(),
                    text: 'Save',
                    disabled: !model.canSave,
                    onClick: () => model.saveAsync(false).linkTo(loadModel)
                }),
                menuItem({
                    icon: Icon.copy(),
                    text: 'Save as...',
                    onClick: () => model.saveAsAsync().linkTo(loadModel)
                }),
                menuItem({
                    icon: Icon.reset(),
                    text: 'Revert View',
                    disabled: !model.isDirty,
                    onClick: () => model.resetAsync().linkTo(loadModel)
                }),
                menuItem({
                    icon: Icon.refresh(),
                    text: 'Reset Default View',
                    omit: !model.isAllowEmpty,
                    onClick: () => model.selectAsync(null).linkTo(loadModel)
                }),
                menuDivider(),
                menuItem({
                    icon: Icon.gear(),
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
                key: view.isFavorite ? `${view.id}-isFavorite` : view.id,
                icon,
                text,
                onClick: () => model.selectAsync(view.id).linkTo(model.loadModel)
            });
    }
}
