import {div, fragment, hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {TreeView} from '@xh/hoist/desktop/cmp/persistenceManager/Types';
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
}

export const [PersistenceManager, persistenceManager] =
    hoistCmp.withFactory<PersistenceManagerProps>({
        displayName: 'PersistenceManager',
        model: uses(PersistenceManagerModel),

        render({model, minimal = false}) {
            const {
                    selectedView,
                    isShared,
                    entity,
                    manageDialogModel,
                    saveDialogModel,
                    omitDefaultMenuComponent
                } = model,
                displayName = entity.displayName;

            return fragment(
                hbox({
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
                            content: div({
                                items: [
                                    div({
                                        className: 'xh-popup__title',
                                        item: capitalize(pluralize(displayName))
                                    }),
                                    objMenu({minimal})
                                ]
                            }),
                            placement: 'bottom-start'
                        }),
                        saveButton()
                    ]
                }),
                manageDialog({omit: !manageDialogModel}),
                saveDialog({omit: !saveDialogModel})
            );
        }
    });

//------------------------
// Implementation
//------------------------

const saveButton = hoistCmp.factory<PersistenceManagerModel>({
    render({model}) {
        return button({
            icon: Icon.save(),
            tooltip: `Save changes to this ${model.entity.displayName}`,
            intent: 'primary',
            omit: !model.enableTopLevelSaveButton || !model.canSave,
            onClick: () => model.saveAsync(false).linkTo(model.loadModel)
        });
    }
});

const objMenu = hoistCmp.factory<PersistenceManagerProps>({
    render({model, minimal}) {
        const {loadModel, entity} = model,
            items = [];

        model.viewTree.forEach(it => {
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
                    text: 'Reset Defaults',
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

function buildView(view: TreeView, model: PersistenceManagerModel): ReactNode {
    const {itemType, text, selected, items, key} = view,
        icon = selected ? Icon.check() : Icon.placeholder();
    switch (itemType) {
        case 'divider':
            return menuDivider({title: text});
        case 'menuFolder':
            return menuItem({
                text,
                icon,
                shouldDismissPopover: false,
                children: items ? items.map(child => buildView(child, model)) : []
            });
        case 'view':
            return menuItem({
                key,
                icon,
                text,
                onClick: () => model.selectAsync(key).linkTo(model.loadModel)
            });
    }
}
