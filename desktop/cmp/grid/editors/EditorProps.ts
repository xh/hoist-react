/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {Column, GridModel} from '@xh/hoist/cmp/grid';
import {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistProps, PlainObject} from '@xh/hoist/core';
import {StoreRecord} from '@xh/hoist/data';
import '@xh/hoist/desktop/register';

export interface EditorProps<InputPropsT extends HoistInputProps> extends HoistProps {

    /** Column in StoreRecord being edited. */
    column: Column;

    /** Owning GridModel of record being edited.  */
    gridModel: GridModel;

    /** StoreRecord being edited. */
    record: StoreRecord;

    /** Props to pass through to the underlying HoistInput component */
    inputProps: InputPropsT;

    agParams: PlainObject;
}
