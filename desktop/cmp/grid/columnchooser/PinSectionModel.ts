import {HoistModel} from '@xh/hoist/core';
import {makeObservable} from '@xh/hoist/mobx';
import type {HSide} from '@xh/hoist/core';

/**
 * @internal
 * Model for a single pin zone within the ColumnChooser.
 * Each zone (left-pinned, center, right-pinned) has its own PinSectionModel.
 */
export class PinSectionModel extends HoistModel {
    override xhImpl = true;

    /** Which pin zone: 'left', null (center), or 'right'. */
    pinned: HSide;

    constructor({pinned}: {pinned: HSide}) {
        super();
        makeObservable(this);
        this.pinned = pinned;
    }
}
