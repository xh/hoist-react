import {div, fragment, hbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, PlainObject, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon/Icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {groupBy, keys, sortBy} from 'lodash';
import {ReactNode} from 'react';
import {manageDialog} from './impl/ManageDialog';
import {saveDialog} from './impl/SaveDialog';
import './PersistenceManager.scss';
import {PersistenceManagerModel} from './PersistenceManagerModel';

interface PersistenceManagerModelProps extends HoistProps {
    model?: PersistenceManagerModel;
    /** True to disable options for saving/managing items. */
    minimal?: boolean;
}

export const [PersistenceManager, persistenceManager] =
    hoistCmp.withFactory<PersistenceManagerModelProps>({
        displayName: 'PersistenceManager',
        model: uses(PersistenceManagerModel),

        render({model, minimal = false}) {
            const {
                selectedObject,
                isShared,
                capitalPluralNoun,
                manageDialogModel,
                saveDialogModel
            } = model;

            return fragment(
                hbox({
                    className: 'persistence-manager',
                    items: [
                        popover({
                            item: button({
                                text: selectedObject?.name
                                    ? getHierarchyDisplayName(selectedObject.name)
                                    : capitalPluralNoun,
                                icon: isShared ? Icon.users() : Icon.bookmark(),
                                rightIcon: Icon.chevronDown(),
                                outlined: true
                            }),
                            content: div({
                                items: [
                                    div({className: 'xh-popup__title', item: capitalPluralNoun}),
                                    objMenu({minimal})
                                ]
                            }),
                            placement: 'bottom-start'
                        }),
                        saveButton()
                    ]
                }),
                manageDialogModel ? manageDialog({key: manageDialogModel.xhId}) : null,
                saveDialogModel ? saveDialog({key: saveDialogModel.xhId}) : null
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
            tooltip: `Save changes to this ${model.noun}`,
            intent: 'primary',
            omit: !model.enableTopLevelSaveButton || !model.canSave,
            onClick: () => model.saveAsync(null).linkTo(model.loadModel)
        });
    }
});

const objMenu = hoistCmp.factory<PersistenceManagerModelProps>({
    render({model, minimal}) {
        const {pluralNoun, objects, loadModel} = model,
            grouped = groupBy(objects, it => it.group),
            sortedGroupKeys = keys(grouped).sort(),
            items = [];

        sortedGroupKeys.forEach(group => {
            items.push(menuDivider({title: group}));
            items.push(...hierarchicalMenus(sortBy(grouped[group], 'name')));
        });

        return menu({
            items: [
                ...items,
                fragment({
                    omit: minimal,
                    items: [
                        menuDivider(),
                        menuItem({
                            icon: Icon.plus(),
                            text: 'New...',
                            onClick: () => model.createNewAsync().linkTo(loadModel)
                        }),
                        menuItem({
                            icon: Icon.save(),
                            text: 'Save',
                            disabled: !model.canSave,
                            onClick: () => model.saveAsync(null).linkTo(loadModel)
                        }),
                        menuItem({
                            icon: Icon.copy(),
                            text: 'Save as...',
                            onClick: () => model.saveAsAsync().linkTo(loadModel)
                        }),
                        menuItem({
                            icon: Icon.reset(),
                            text: 'Reset',
                            disabled: !model.isDirty,
                            onClick: () => model.resetAsync().linkTo(loadModel)
                        }),
                        menuDivider(),
                        menuItem({
                            icon: Icon.gear(),
                            text: `Manage ${pluralNoun}...`,
                            onClick: () => model.openManageDialog()
                        })
                    ]
                })
            ]
        });
    }
});

/**
 * @param records
 * @param depth  used during recursion, depth in the path string/hierarchy
 * @returns an array of menuItem()s
 */
function hierarchicalMenus(records: PlainObject[], depth: number = 0): ReactNode[] {
    const groups = {},
        unbalancedStableGroupsAndRecords = [];

    records.forEach(record => {
        // Leaf Node
        if (getNameHierarchySubstring(record.name, depth + 1) == null) {
            unbalancedStableGroupsAndRecords.push(record);
            return;
        }
        // Belongs to an already defined group
        const group = getNameHierarchySubstring(record.name, depth);
        if (groups[group]) {
            groups[group].children.push(record);
            return;
        }
        // Belongs to a not defined group, create it
        groups[group] = {name: group, children: [record], isMenuFolder: true};
        unbalancedStableGroupsAndRecords.push(groups[group]);
    });

    return unbalancedStableGroupsAndRecords.map(it => {
        if (it.isMenuFolder) {
            return objMenuFolder({
                name: it.name,
                items: hierarchicalMenus(it.children, depth + 1),
                depth
            });
        }
        return objMenuItem({record: it});
    });
}

const objMenuFolder = hoistCmp.factory<PersistenceManagerModel>({
    render({model, name, depth, children}) {
        const selected = isFolderForEntry(name, model.selectedObject?.name, depth),
            icon = selected ? Icon.check() : Icon.placeholder();
        return menuItem({
            text: getHierarchyDisplayName(name),
            icon,
            shouldDismissPopover: false,
            children
        });
    }
});

const objMenuItem = hoistCmp.factory<PersistenceManagerModel>({
    render({model, record}) {
        const {id, name} = record,
            selected = model.selectedId === id,
            icon = selected ? Icon.check() : Icon.placeholder();

        return menuItem({
            key: id,
            icon: icon,
            text: getHierarchyDisplayName(name),
            onClick: () => model.selectAsync(id).linkTo(model.loadModel)
        });
    }
});

function isFolderForEntry(folderName, entryName, depth) {
    const name = getNameHierarchySubstring(entryName, depth);
    return name && name === folderName && folderName.length < entryName.length;
}

function getNameHierarchySubstring(name, depth) {
    const arr = name?.split('\\') ?? [];
    if (arr.length <= depth) {
        return null;
    }
    return arr.slice(0, depth + 1).join('\\');
}

function getHierarchyDisplayName(name) {
    return name?.substring(name.lastIndexOf('\\') + 1);
}
