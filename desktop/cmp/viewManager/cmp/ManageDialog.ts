import {form} from '@xh/hoist/cmp/form';
import {grid} from '@xh/hoist/cmp/grid';
import {br, div, filler, fragment, hframe, placeholder, spacer, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps, XH} from '@xh/hoist/core';
import {ManageDialogModel} from '@xh/hoist/core/persist/viewManager/impl/ManageDialogModel';
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
    className: 'xh-persistence-manager__manage-dialog',
    model: creates(ManageDialogModel),

    render({model, onClose}) {
        const {displayName, saveTask, deleteTask} = model;
        return dialog({
            isOpen: true,
            icon: Icon.gear(),
            title: `Manage ${capitalize(pluralize(displayName))}`,
            className: 'xh-persistence-manager__manage-dialog',
            style: {width: 800, height: 475, maxWidth: '90vm'},
            canOutsideClickClose: false,
            onClose,
            item: panel({
                mask: [saveTask, deleteTask],
                item: hframe(gridPanel(), formPanel({onClose}))
            })
        });
    }
});

const gridPanel = hoistCmp.factory({
    render() {
        return panel({
            className: 'xh-persistence-manager__manage-dialog__grid-panel',
            modelConfig: {defaultSize: 350, side: 'left', collapsible: false},
            item: grid()
        });
    }
});

const formPanel = hoistCmp.factory<ManageDialogProps>({
    render({model, onClose}) {
        const {selectedId, displayName, formModel, canEdit} = model,
            {values} = formModel;

        if (!selectedId)
            return panel({
                item: placeholder(`Select a ${displayName}`),
                bbar: [
                    filler(),
                    button({
                        text: 'Close',
                        onClick: onClose
                    })
                ]
            });

        return panel({
            className: 'xh-persistence-manager__manage-dialog__form-panel',
            item: vframe({
                className: 'xh-persistence-manager__manage-dialog__form',
                items: [
                    form({
                        fieldDefaults: {
                            inline: true,
                            minimal: true,
                            commitOnChange: true
                        },
                        items: [
                            formField({
                                field: 'name',
                                item: textInput(),
                                info: canEdit
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
                                item: switchInput({
                                    labelSide: 'left'
                                }),
                                omit: !model.canManageGlobal
                            }),
                            formField({
                                field: 'isFavorite',
                                item: switchInput({
                                    labelSide: 'left'
                                })
                            })
                        ]
                    }),
                    spacer({
                        height: 10,
                        omit: !model.showSaveButton
                    }),
                    button({
                        icon: Icon.check(),
                        text: 'Save Changes',
                        intent: 'success',
                        minimal: false,
                        style: {margin: '0 20px'},
                        omit: !model.showSaveButton,
                        onClick: () => model.saveAsync()
                    }),
                    filler(),
                    div({
                        items: [
                            `Created ${fmtCompactDate(values.dateCreated)} by ${
                                values.owner === XH.getUsername() ? 'you' : values.owner
                            }.`,
                            br(),
                            `Updated ${fmtCompactDate(values.lastUpdated)} by ${
                                values.lastUpdatedBy === XH.getUsername()
                                    ? 'you'
                                    : values.lastUpdatedBy
                            }.`
                        ],
                        className: 'xh-text-color-muted'
                    })
                ]
            }),
            bbar: bbar({onClose})
        });
    }
});

const bbar = hoistCmp.factory<ManageDialogProps>({
    render({model, onClose}) {
        const {formModel} = model;
        return toolbar(
            button({
                icon: Icon.delete(),
                text: 'Delete',
                intent: 'danger',
                disabled: !model.canDelete,
                onClick: () => model.deleteAsync()
            }),
            filler(),
            button({
                icon: Icon.reset(),
                tooltip: 'Revert changes',
                omit: !model.showSaveButton,
                onClick: () => formModel.reset()
            }),
            '-',
            button({
                text: 'Close',
                onClick: onClose
            })
        );
    }
});
