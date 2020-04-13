/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {hoistCmp, useContextModel, useLocalModel, XH} from '@xh/hoist/core';
import {Store} from '@xh/hoist/data';
import {storeFilterFieldImpl as desktopStoreFilterFieldImpl} from '@xh/hoist/dynamics/desktop';
import {storeFilterFieldImpl as mobileStoreFilterFieldImpl} from '@xh/hoist/dynamics/mobile';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {StoreFilterFieldImplModel} from './impl/StoreFilterFieldImplModel';

/**
 * A text input Component that generates a filter function based on simple word-boundary matching of
 * its value to the value of configured fields on a candidate object. If any field values match, the
 * object itself is considered a match.
 *
 * Designed to easily filter records within a Store - either directly (most common) or indirectly
 * via a callback (in cases where custom logic is required, such as layering on additional filters).
 * A Store can be bound to this component via either its `store` OR `gridModel` props, or manually
 * by writing an onFilterChange prop.
 *
 * This object will default to point to the store of a GridModel found in context, if neither a store,
 * nor a GridModel are provided.  If you *do* not want this behavior (e.g. you intend to manually
 * wire it with onFilterChange) be sure to set GridModel to *null*.
 *
 * Fields to be searched can be automatically determined from the bound Store or GridModel, and/or
 * customized via the include/excludeFields props. See prop comments for details.
 *
 * This component supports all props available to TextInput and will pass them along to its
 * underlying TextInput.
 */
export const [StoreFilterField, storeFilterField] = hoistCmp.withFactory({
    displayName: 'StoreFilterField',
    className: 'xh-store-filter-field',

    render({gridModel, store, ...props}) {
        throwIf(gridModel && store, "Cannot specify both 'gridModel' and 'store' props.");

        if (!store) {
            gridModel = withDefault(gridModel, useContextModel(GridModel));
            store = gridModel ? gridModel.store : null;
        }

        // Right now we freeze the initial props -- could be more dynamic.
        const implModel = useLocalModel(() => new StoreFilterFieldImplModel({gridModel, store, ...props}));
        return XH.isMobile ? mobileStoreFilterFieldImpl({implModel, ...props}) : desktopStoreFilterFieldImpl({implModel, ...props});
    }
});

StoreFilterField.propTypes = {

    /**
     * Field on optional model to which this component should bind its value. Not required
     * for filtering functionality (see `gridModel`, `onFilterChange`, and `store` props), but
     * allows the value of this component to be controlled via an external model observable.
     */
    bind: PT.string,

    /** Names of field(s) to exclude from search. Cannot be used with `includeFields`. */
    excludeFields: PT.arrayOf(PT.string),

    /**
     * Delay (in ms) to buffer filtering of the store after the value changes from user input.
     * Default 200ms. Set to 0 to filter immediately on each keystroke. Applicable only when
     * bound to a Store (directly or via a GridModel).
     */
    filterBuffer: PT.number,

    /** Fixed options for Filter to be generated. @see StoreFilter. */
    filterOptions: PT.object,

    /**
     * GridModel whose Store this control should filter. When given a GridModel, this component
     * will, by default, use the fields for all *visible* columns when matching, as well as any
     * groupBy field. Do not configure this and `store` on the same component.
     */
    gridModel: PT.instanceOf(GridModel),

    /**
     * Names of field(s) to include in search. Required if neither a store nor gridModel are
     * provided, as otherwise fields cannot be inferred.
     *
     * Can be used along with a gridModel to ensure a field is included, regardless of column
     * visibility. Cannot be used with `excludeFields`.
     */
    includeFields: PT.arrayOf(PT.string),

    /** Optional model for value binding - see comments on the `bind` prop for details. */
    model: PT.object,

    /**
     * Callback to receive an updated StoreFilter. Can be used in place of the `store` or
     * `gridModel` prop when direct filtering of a bound store by this component is not desired.
     * NOTE that calls to this function are NOT buffered and will be made on each keystroke.
     */
    onFilterChange: PT.func,

    /** Text to display when the input is empty. */
    placeholder: PT.string,

    /**
     * Store that this control should filter. By default, all fields configured on the Store
     * will be used for matching. Do not configure this and `gridModel` on the same component.
     */
    store: PT.instanceOf(Store),

    /** Width of the input in pixels. */
    width: PT.number
};