/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core/model';
import {LayoutProps} from '@xh/hoist/utils/react';

/**
 * Props interface for Hoist Components.
 *
 * This interface brings in additional properties that are added to the props
 * collection by HoistComponent.
 */
export interface HoistProps<M extends HoistModel = HoistModel> {

    /**
     * Associated HoistModel for this Component.  Depending on the component, may be specified as
     * an instance of a HoistModel, or a configuration object to create one, or left undefined.
     * HoistComponent will resolve (i.e. lookup in context or create if needed) a concrete Model
     * instance and provide it to the Render method of the component.
     */
    model?: M;

    /**
     * ClassName for the component.  Includes the classname as provided in props, enhanced with
     * any base class name provided by the component definition itself.
     */
    className?: string;

    /** All other props. */
    [x:string]: any;
}

/**
 * Props for Components that support standard Layout attributes
 *
 * Most component will typically separate these props out and pass them along to another component
 * which also supports this interface.  Eventually, they should be passed to a Box class.
 */
export interface BoxProps<M extends HoistModel = HoistModel> extends HoistProps<M>, LayoutProps {}