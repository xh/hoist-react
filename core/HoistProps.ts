/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core/model';
import {LayoutProps} from '@xh/hoist/utils/react';

/**
 * Enhanced Props, as delivered to the render function of a HoistComponent.
 *
 * This interface brings in additional properties that are added to the props
 * collection by HoistComponent.
 */
export interface HoistProps {

    /**
     * Associated HoistModel for this Component.  May be either the linked model, or
     * the model received via context.
     */
    model?: HoistModel;

    /**
     * ClassName for the component.  Includes the classname as provided in props, enhanced with
     * any base class name provided by the component definition itself.
     */
    className?: string;

    /**
     * All other props
     */
    [x:string]: any;
}

/**
 * Props for Components that support standard Layout attributes
 *
 * Most component will typically separate these props out and pass them along to another component
 * which also supports this interface.  Eventually, they should be passed to a Box class.
 */
export interface BoxProps extends HoistProps, LayoutProps {}