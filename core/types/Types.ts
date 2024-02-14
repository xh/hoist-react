/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ElementFactory} from '@xh/hoist/core';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {MomentInput} from 'moment';
import {Component, FunctionComponent, ReactElement} from 'react';
import {DebounceSettings} from 'lodash';

/** Values available for intents. */
export type Intent = 'primary' | 'success' | 'warning' | 'danger';

/** Values available for App Theme. */
export type Theme = 'system' | 'dark' | 'light';

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type VSide = 'top' | 'bottom';
export type HSide = 'left' | 'right';
export type Corner = 'tl' | 'tr' | 'bl' | 'br';

export type HAlign = 'left' | 'right' | 'center';
export type VAlign = 'top' | 'bottom' | 'center';

/** Convenience type for common pattern of accepting a single T, or an array of Ts. */
export type Some<T> = T | T[];

export type Thunkable<T> = T | (() => T);
export type Awaitable<T> = Promise<T> | T;

/** Convenience type for a "plain", string-keyed object holding any kind of values. */
export type PlainObject = Record<string, any>;

/**
 * Specification for debouncing in Hoist.
 *
 * When specified as object, should contain an 'interval' and other optional keys for
 * lodash.  If specified as number the default lodash debounce will be used.
 */
export type DebounceSpec = number | (DebounceSettings & {interval: number});

/**
 * Argument passed to components that create views on demand.
 *
 * Used by the TabContainer, DashContainer, DockView, and Navigator APIs to process the 'content'
 * configs provided to them for their tabs and views.
 *
 * Can be a ReactElement, HoistComponent or function. If a function, it may be an ElemFactory or any
 * function that returns a ReactElement. In either case, the function will be called with no arguments.
 */
export type Content =
    | ReactElement
    | FunctionComponent
    | Component
    | ElementFactory
    | (() => ReactElement);

export type DateLike = Date | LocalDate | MomentInput;

export type PageState =
    /**
     * Window/tab is visible and focused.
     */
    | 'active'
    /**
     * Window/tab is visible but not focused - i.e. the browser is visible on the screen and this
     * tab is active, but another application in the OS is currently focused, or the user is
     * interacting with controls in the browser outside of this page, like the URL bar.
     */
    | 'passive'
    /**
     * Window/tab is not visible - browser is either on another tab within the same window, or the
     * entire browser is minimized or hidden behind another application in the OS.
     */
    | 'hidden'
    /**
     * Page has been frozen by the browser due to inactivity (as a perf/memory/power optimization)
     * or because the user has navigated away and the page is in the back/forward cache (but not
     * yet completely unloaded / terminated).
     */
    | 'frozen'
    /**
     * The page is in the process of being unloaded by the browser (this is a terminal state x_x).
     */
    | 'terminated';
