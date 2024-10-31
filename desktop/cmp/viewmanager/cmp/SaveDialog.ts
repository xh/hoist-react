import {form} from '@xh/hoist/cmp/form';
import {filler, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {SaveDialogModel} from '@xh/hoist/core/persist/viewmanager/impl/SaveDialogModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';

export const saveDialog = hoistCmp.factory<SaveDialogModel>({
    displayName: 'SaveDialog',
    className: 'xh-view-manager__save-dialog',
    model: uses(SaveDialogModel),

    render({model, className}) {
        if (!model.isOpen) return null;

        return dialog({
            title: `Save as...`,
            icon: Icon.copy(),
            className,
            isOpen: true,
            style: {width: 500},
            canOutsideClickClose: false,
            onClose: () => model.cancel(),
            item: formPanel()
        });
    }
});

const formPanel = hoistCmp.factory<SaveDialogModel>({
    render({model}) {
        return panel({
            item: form({
                fieldDefaults: {
                    inline: true,
                    minimal: true,
                    commitOnChange: true
                },
                item: vframe({
                    className: 'xh-view-manager__save-dialog__form',
                    items: [
                        formField({
                            field: 'name',
                            item: textInput({
                                autoFocus: true,
                                selectOnFocus: true,
                                onKeyDown: e => {
                                    if (e.key === 'Enter') model.saveAsAsync();
                                }
                            })
                        }),
                        formField({
                            field: 'description',
                            item: textArea({
                                selectOnFocus: true,
                                height: 90
                            })
                        })
                    ]
                })
            }),
            bbar: bbar(),
            mask: model.saveTask
        });
    }
});

const bbar = hoistCmp.factory<SaveDialogModel>({
    render({model}) {
        const {formModel} = model;
        return toolbar(
            filler(),
            button({
                text: 'Cancel',
                onClick: () => model.cancel()
            }),
            button({
                text: 'Save as new copy',
                icon: Icon.copy(),
                outlined: true,
                intent: 'success',
                disabled: !formModel.isValid,
                onClick: () => model.saveAsAsync()
            })
        );
    }
});
