/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {CubeGridModel} from '@xh/hoist/cmp/cubegrid';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';

/** A GridModel, or a model wrapping one - what grid-bound fields and buttons accept. */
export type GridLikeModel = GridModel | ZoneGridModel | CubeGridModel;

export function isGridLikeModel(it: unknown): it is GridLikeModel {
    return it instanceof GridModel || it instanceof ZoneGridModel || it instanceof CubeGridModel;
}

/** The GridModel behind a grid-like model. */
export function getGridModel(it: GridLikeModel): GridModel {
    return it instanceof GridModel ? it : (it?.gridModel ?? null);
}
