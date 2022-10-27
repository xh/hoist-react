/*
* This file belongs to Hoist, an application development toolkit
* developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
*
* Copyright © 2022 Extremely Heavy Industries Inc.
*/
import {ElemFactory} from '@xh/hoist/core';
import {Component, FunctionComponent, ReactElement} from 'react';
import {DebounceSettings} from 'lodash';


/** Values available for intents. */
export type Intent = 'primary'|'success'|'warning'|'danger';

/** Values available for App Theme. */
export type Theme = 'system'|'dark'|'light';

/** Side for layout related components such as Panel and TabContainer. */
export type Side = 'top'|'bottom'|'left'|'right';
export type VSide = 'top'|'bottom';
export type HSide = 'left'|'right';

export type HAlign = 'left'|'right'|'center';
export type VAlign = 'top'|'bottom'|'center';


/** Convenience type for common pattern of accepting a single T, or an array of Ts. */
export type Some<T> = T|T[];

/** Convenience type for a "plain", string-keyed object holding any kind of values. */
export type PlainObject = Record<string, any>;

/**
 * Specification for debouncing in Hoist.
 *
 * When specified as object, should contain an 'interval' and other optional keys for
 * lodash.  If specified as number the default lodash debounce will be used.
 */
export type DebounceSpec = number|(DebounceSettings & {interval: number});

/**
 * Argument passed to components that create views on demand.
 *
 * Used by the TabContainer, DashContainer, DockView, and Navigator APIs to process the 'content'
 * configs provided to them for their tabs and views.
 *
 * Can be a ReactElement, HoistComponent or function. If a function, it may be an ElemFactory or any
 * function that returns a ReactElement. In either case, the function will be called with no arguments.
 */
export type Content = ReactElement|FunctionComponent|Component|ElemFactory|(() => ReactElement);
