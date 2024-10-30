import {form} from '@xh/hoist/cmp/form';
import {filler, fragment, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {SaveDialogModel} from '@xh/hoist/core/persist/viewmanager/impl/SaveDialogModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';

export const saveDialog = hoistCmp.factory<SaveDialogModel>({
    displayName: 'SaveDialog',
    className: 'xh-persistence-manager__save-dialog',
    model: uses(SaveDialogModel),

    render({model}) {
        const {isOpen} = model;
        return dialog({
            isOpen: isOpen,
            icon: Icon.copy(),
            title: `Save as...`,
            className: 'xh-persistence-manager__save-dialog',
            style: {width: 500, height: 255},
            canOutsideClickClose: false,
            onClose: () => model.cancel(),
            item: fragment(formPanel(), mask({bind: model.saveTask, spinner: true}))
        });
    }
});

const formPanel = hoistCmp.factory<SaveDialogModel>({
    render({model}) {
        return panel({
            item: vframe({
                className: 'xh-persistence-manager__save-dialog__form',
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
                ]
            }),
            bbar: bbar()
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
                icon: Icon.copy(),
                text: 'Save as new copy',
                outlined: true,
                intent: 'success',
                disabled: !formModel.isValid,
                onClick: () => model.saveAsAsync()
            })
        );
    }
});
