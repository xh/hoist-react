import {div, filler} from '@xh/hoist/cmp/layout';
import {HoistModel, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';

export class ChangesToolbarModel extends HoistModel {
    constructor() {
        super();
        makeObservable(this);
    }
}

export const changesToolbar = hoistCmp.factory({
    render() {
        return toolbar({
            items: [
                div('Local role changes: '),

                div('+5'),
                div('-2'),
                filler(),
                button({icon: Icon.add()})
            ],
            className: 'xh-banner xh-intent-warning'
        });
    }
});
