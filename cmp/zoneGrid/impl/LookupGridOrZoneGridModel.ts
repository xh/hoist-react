/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel} from '@xh/hoist/core';
import {ZoneGridModel} from '../ZoneGridModel';

/**
 * Find the GridModel or ZoneGridModel that a linked model's component should bind to from context.
 *
 * A standalone GridModel takes precedence, matching the long-standing behavior of components that
 * look up a GridModel. A ZoneGridModel is returned if no GridModel is found, or if the GridModel
 * found is the ZoneGridModel's own internal grid.
 *
 * @internal
 */
export function lookupGridOrZoneGridModel(model: HoistModel): GridModel | ZoneGridModel {
    const gridModel = model.lookupModel(GridModel),
        zoneGridModel = model.lookupModel(ZoneGridModel);

    return gridModel && gridModel !== zoneGridModel?.gridModel ? gridModel : zoneGridModel;
}
