/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';

export const EditorPropTypes = {

    /** Column in StoreRecord being edited. */
    column: PT.object,

    /** Owning GridModel of record being edited.  */
    gridModel: PT.object,

    /** StoreRecord being edited. */
    record: PT.object,

    /** Props to pass through to the underlying HoistInput component */
    inputProps: PT.object
};
