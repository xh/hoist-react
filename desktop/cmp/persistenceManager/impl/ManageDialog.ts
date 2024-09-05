import {form} from '@xh/hoist/cmp/form';
import {grid} from '@xh/hoist/cmp/grid';
import {br, div, filler, fragment, hframe, placeholder, spacer, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {switchInput, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtCompactDate} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {ManageDialogModel} from './ManageDialogModel';

export const manageDialog = hoistCmp.factory<ManageDialogModel>({
    displayName: 'ManageDialog',
    model: uses(ManageDialogModel),

    render({model}) {
        return dialog({
            isOpen: true,
            icon: Icon.gear(),
            title: `Manage ${model.parentModel.capitalPluralNoun}`,
            className: 'xh-persistence-manager__manage-dialog',
            style: {width: 800, height: 475, maxWidth: '90vm'},
            canOutsideClickClose: false,
            onClose: () => model.close(),
            item: hframe(gridPanel(), formPanel(), mask({bind: model.loadModel, spinner: true}))
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

const formPanel = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
        const {selectedId, noun, pluralNoun, formModel, canEdit} = model,
            {values} = formModel;

        if (!selectedId)
            return panel({
                item: placeholder(`Select a ${noun}`),
                bbar: [
                    filler(),
                    button({
                        text: 'Close',
                        onClick: () => model.close()
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
                                          `Organize your ${pluralNoun} into folders by including the "\\" character in their names - e.g. "My folder\\My ${noun}".`
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
            bbar: bbar()
        });
    }
});

const bbar = hoistCmp.factory<ManageDialogModel>({
    render({model}) {
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
                onClick: () => model.close()
            })
        );
    }
});
