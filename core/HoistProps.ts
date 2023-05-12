/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core/model';
import {CSSProperties, HTMLAttributes, ReactNode, Ref} from 'react';

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
     * Used for specifying the *configuration* of a model to be created by Hoist for this component
     * when first mounted.  Should be used only on a component that specifies the 'uses()' directive
     * with the `createFromConfig` set as true. See the `uses()` directive for more information.
     */
    modelConfig?: M extends null ? never : M['config'];

    /**
     * Used for gaining a reference to the model of a HoistComponent.
     */
    modelRef?: M extends null ? never : Ref<M>;

    /**
     * ClassName for the component.  Includes the classname as provided in props, enhanced with
     * any base class name provided by the component definition itself.
     */
    className?: string;

    /** React children. */
    children?: ReactNode;
}

/**
 * A version of Hoist props that allows dynamic keys/properties.   This is the interface that
 * Hoist uses for components that do not explicitly specify the type of props they expect.
 *
 * This behavior is useful for file or package-local components that do not require an explicit
 * props API.
 */

export interface DefaultHoistProps<M extends HoistModel = HoistModel> extends HoistProps<M> {
    [x: string]: any;
}

/**
 * Props for Components that support standard Layout attributes
 *
 * Most component will typically separate these props out and pass them along to another component
 * which also supports this interface.  Eventually, they should be passed to a Box class.
 */
export interface BoxProps
    extends LayoutProps,
        Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'contextMenu'> {}

export interface StyleProps {
    style?: CSSProperties;
}

export interface LayoutProps {
    margin?: string | number;
    marginTop?: string | number;
    marginRight?: string | number;
    marginBottom?: string | number;
    marginLeft?: string | number;

    padding?: string | number;
    paddingTop?: string | number;
    paddingRight?: string | number;
    paddingBottom?: string | number;
    paddingLeft?: string | number;

    height?: string | number;
    minHeight?: string | number;
    maxHeight?: string | number;
    width?: string | number;
    minWidth?: string | number;
    maxWidth?: string | number;

    flex?: string | number;
    flexBasis?: string | number;
    flexDirection?: string | number;
    flexGrow?: string | number;
    flexShrink?: string | number;
    flexWrap?: string | number;

    alignItems?: string;
    alignSelf?: string;
    alignContent?: string;
    justifyContent?: string;

    overflow?: string;
    overflowX?: string;
    overflowY?: string;

    top?: string | number;
    left?: string | number;
    position?: string;
    display?: string;
}
