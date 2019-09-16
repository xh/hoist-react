/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH, hoistCmp, uses, useLocalModel, HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {filler, span} from '@xh/hoist/cmp/layout';
import {select} from '@xh/hoist/desktop/cmp/input';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {hotkeysHost} from '@xh/hoist/desktop/cmp/hotkeys/HotkeysHost';
import {ImpersonationBarModel} from '@xh/hoist/appcontainer/ImpersonationBarModel';

/**
 * An admin-only toolbar that provides a UI for impersonating application users, as well as ending
 * any current impersonation setting. Can be shown via a global Shift+i keyboard shortcut.
 *
 * @private
 */
export const impersonationBar = hoistCmp.factory({
    displayName: 'ImpersonationBar',
    model: uses(ImpersonationBarModel),

    render({model}) {
        if (!model.canImpersonate) return null;

        return hotkeysHost({
            hotkeys: [{
                global: true,
                combo: 'shift + i',
                label: 'Open Impersonation Dialog',
                onKeyDown: () => model.toggleVisibility()
            }],
            item: model.isOpen ? displayBar() : null
        });
    }
});


const displayBar = hoistCmp.factory({
    render({model}) {
        const {isImpersonating, targets} = model,
            localModel = useLocalModel(() => new LocalModel(model));

        return toolbar({
            style: {color: 'white', backgroundColor: 'midnightblue', zIndex: 9999},
            items: [
                Icon.user(),
                span(`${isImpersonating ? 'Impersonating' : ''} ${XH.getUsername()}`),
                filler(),
                select({
                    model: localModel,
                    bind: 'pendingTarget',
                    options: targets,
                    enableCreate: true,
                    placeholder: 'Select User...',
                    width: 200,
                    onCommit: localModel.onCommit
                }),
                button({
                    text: isImpersonating ? 'Exit Impersonation' : 'Cancel',
                    style: {color: 'white'},
                    onClick: localModel.onExitClick
                })
            ]
        });
    }
});


@HoistModel
class LocalModel {

    model;
    @bindable pendingTarget = null;

    constructor(model) {
        this.model = model;
    }

    onCommit = () => {
        if (this.pendingTarget) {
            this.model.impersonateAsync(
                this.pendingTarget
            ).catch(e => {
                this.setPendingTarget('');
                XH.handleException(e, {logOnServer: false});  // likely to be an unknown user
            });
        }
    };

    onExitClick = () => {
        const {model} = this;
        if (model.isImpersonating) {
            model.endImpersonateAsync();
        } else {
            model.hide();
        }
    };
}