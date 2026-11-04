/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel} from '@xh/hoist/cmp/grid';
import {GridModel} from '@xh/hoist/cmp/grid';
import {CubeGridModel} from '@xh/hoist/cmp/cubegrid';
import {ZoneGridModel} from '@xh/hoist/cmp/zoneGrid';

export function isGridLikeModel(it: unknown): it is GridLikeModel {
    return it instanceof GridModel || it instanceof ZoneGridModel || it instanceof CubeGridModel;
}
