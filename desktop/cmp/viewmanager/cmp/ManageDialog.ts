import {form} from '@xh/hoist/cmp/form';
import {grid} from '@xh/hoist/cmp/grid';
import {
    div,
    filler,
    fragment,
    hbox,
    hframe,
    hspacer,
    placeholder,
    vframe
} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps, XH} from '@xh/hoist/core';
import {ManageDialogModel} from '@xh/hoist/core/persist/viewmanager/impl/ManageDialogModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {switchInput, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtCompactDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {pluralize} from '@xh/hoist/utils/js';
import {capitalize} from 'lodash';

export interface ManageDialogProps extends HoistProps<ManageDialogModel> {
    onClose: () => void;
}

export const manageDialog = hoistCmp.factory<ManageDialogProps>({
    displayName: 'ManageDialog',
    className: 'xh-view-manager__manage-dialog',
    model: creates(ManageDialogModel),

    render({model, className, onClose}) {
        const {displayName, saveTask, deleteTask} = model;
        return dialog({
            title: `Manage ${capitalize(pluralize(displayName))}`,
            icon: Icon.gear(),
            className,
            isOpen: true,
            style: {width: '800px', maxWidth: '90vm', minHeight: '420px'},
            canOutsideClickClose: false,
            onClose,
            item: panel({
                item: hframe(gridPanel(), formPanel({onClose})),
                mask: [saveTask, deleteTask]
            })
        });
    }
});

const gridPanel = hoistCmp.factory({
    render() {
        return panel({
            modelConfig: {defaultSize: 350, side: 'left', collapsible: false},
            item: grid()
        });
    }
});

const formPanel = hoistCmp.factory<ManageDialogProps>({
    render({model, onClose}) {
        const {displayName, formModel} = model,
            {values} = formModel;

        if (model.hasMultiSelection) {
            return multiSelectionPanel();
        }

        if (!model.selectedId)
            return panel({
                item: placeholder(Icon.gears(), `Select a ${displayName}`),
                bbar: bbar({onClose})
            });

        return panel({
            item: form({
                fieldDefaults: {
                    inline: true,
                    minimal: true,
                    commitOnChange: true
                },
                item: vframe({
                    className: 'xh-view-manager__manage-dialog__form',
                    items: [
                        formField({
                            field: 'name',
                            item: textInput(),
                            info: model.canEdit
                                ? fragment(
                                      Icon.info(),
                                      `Organize your ${pluralize(displayName)} into folders by including the "\\" character in their names - e.g. "My folder\\My ${displayName}".`
                                  )
                                : null
                        }),
                        formField({
                            field: 'description',
                            item: textArea({
                                selectOnFocus: true,
                                height: 70
                            }),
                            readonlyRenderer: v => (v ? v : '[None]')
                        }),
                        formField({
                            field: 'isShared',
                            item: switchInput({labelSide: 'left'}),
                            omit: !model.canManageGlobal
                        }),
                        formField({
                            field: 'isFavorite',
                            omit: !model.enableFavorites,
                            item: switchInput({labelSide: 'left'})
                        }),
                        hbox({
                            omit: !model.showSaveButton,
                            style: {margin: '10px 20px'},
                            items: [
                                button({
                                    text: 'Save Changes',
                                    icon: Icon.check(),
                                    intent: 'success',
                                    minimal: false,
                                    flex: 1,
                                    onClick: () => model.saveAsync()
                                }),
                                hspacer(),
                                button({
                                    icon: Icon.reset(),
                                    tooltip: 'Revert changes',
                                    minimal: false,
                                    onClick: () => formModel.reset()
                                })
                            ]
                        }),
                        filler(),
                        div({
                            className: 'xh-view-manager__manage-dialog__metadata',
                            items: [
                                `Created ${fmtCompactDate(values.dateCreated)} by ${
                                    values.owner === XH.getUsername() ? 'you' : values.owner
                                }. `,
                                `Updated ${fmtCompactDate(values.lastUpdated)} by ${
                                    values.lastUpdatedBy === XH.getUsername()
                                        ? 'you'
                                        : values.lastUpdatedBy
                                }.`
                            ]
                        })
                    ]
                })
            }),
            bbar: bbar({onClose})
        });
    }
});

const multiSelectionPanel = hoistCmp.factory<ManageDialogProps>({
    render({model, onClose}) {
        const {selectedIds} = model;
        return panel({
            item: vframe({
                alignItems: 'center',
                justifyContent: 'center',
                item: button({
                    text: `Delete ${selectedIds.length} ${pluralize(model.displayName)}`,
                    icon: Icon.delete(),
                    intent: 'danger',
                    outlined: true,
                    disabled: !model.canDelete,
                    onClick: () => model.deleteAsync()
                })
            }),
            bbar: bbar({onClose})
        });
    }
});

const bbar = hoistCmp.factory<ManageDialogProps>({
    render({model, onClose}) {
        return toolbar(
            button({
                text: 'Delete',
                icon: Icon.delete(),
                intent: 'danger',
                disabled: !model.canDelete,
                omit: model.hasMultiSelection,
                onClick: () => model.deleteAsync()
            }),
            filler(),
            button({
                text: 'Close',
                onClick: onClose
            })
        );
    }
});
