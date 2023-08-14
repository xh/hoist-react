import {div} from '@xh/hoist/cmp/layout';
import {HoistModel, hoistCmp, uses} from '@xh/hoist/core';
import {capitalizeWords} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {roleUpdateForm} from './RoleUpdateForm';

type DialogReason = 'add' | 'edit';

export class RoleDialogModel extends HoistModel {
    @bindable private _isOpen = null;

    reason: DialogReason;

    constructor() {
        super();
        makeObservable(this);
    }

    public isOpen() {
        return this._isOpen;
    }

    public openDialog(reason: DialogReason) {
        this.reason = reason;
        this._isOpen = true;
    }

    public closeDialog() {
        this._isOpen = false;
    }
}

export const roleDialog = hoistCmp.factory({
    model: uses(RoleDialogModel),

    render({model}) {
        return model.isOpen()
            ? dialog({
                  title: `${capitalizeWords(model.reason)} Role`,
                  canOutsideClickClose: false,
                  isOpen: model.isOpen(),
                  onClose: () => {
                      model.closeDialog();
                  },
                  item: div({
                      item: roleUpdateForm()
                  }),
                  icon: model.reason === 'add' ? Icon.add() : Icon.edit(),
                  style: {width: '600px'}
              })
            : null;
    }
});
