/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {GridLikeModel} from '@xh/hoist/cmp/grid';
import {GridModel} from '@xh/hoist/cmp/grid';
import type {HoistModel} from '@xh/hoist/core';

/** True for a GridModel, or any model exposing one as `innerGridModel`. */
export function isGridLikeModel(it: unknown): it is GridLikeModel {
    return (
        !!(it as HoistModel)?.isHoistModel &&
        (it as GridLikeModel).innerGridModel instanceof GridModel
    );
}
