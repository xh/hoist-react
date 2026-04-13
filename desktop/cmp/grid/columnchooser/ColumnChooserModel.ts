import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel} from '@xh/hoist/core';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {withDefault} from '@xh/hoist/utils/js';

export interface ColumnChooserConfig {
    /** GridModel whose columns this chooser manages. Falls back to context lookup. */
    gridModel?: GridModel;
}

/**
 * Model for the new ColumnChooser component. Manages an internal representation of the target
 * grid's columns and provides controls for visibility toggling, reordering, and pin management.
 */
export class ColumnChooserModel extends HoistModel {
    override xhImpl = true;

    /** Show column groups as tree hierarchy (true) or flat leaf list (false). */
    @bindable showGroups: boolean = true;

    /** Current quick-filter text. */
    @bindable filterText: string = '';

    /** The GridModel whose columns this chooser manages. */
    @computed
    get gridModel(): GridModel {
        const ret = withDefault(this.componentProps?.gridModel, this.lookupModel(GridModel));
        if (!ret) {
            this.logError("No GridModel available. Provide via a 'gridModel' prop, or context.");
        }
        return ret;
    }

    constructor() {
        super();
        makeObservable(this);
    }
}
