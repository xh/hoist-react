/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistInputProps} from '@xh/hoist/cmp/input';
import {HoistProps, LayoutProps, PlainObject, SelectOption} from '@xh/hoist/core';
import {ReactNode} from 'react';

export interface MobileSelectProps extends HoistProps, HoistInputProps, LayoutProps {
    /**
     * Function to return a "create a new option" string prompt. Requires `allowCreate` true.
     * Passed current query input.
     */
    createMessageFn?: (query: string) => string;

    /** True (default) to close the menu after each selection. */
    closeMenuOnSelect?: boolean;

    /**
     * True to accept and commit input values not present in options or returned by a query.
     * Usually used with enableFullscreen, to ensure access to the mobile device keyboard.
     */
    enableCreate?: boolean;

    /**
     * True to enable type-to-search keyboard input. Defaults to false to disable keyboard input,
     * showing the dropdown menu on click. Usually used with enableFullscreen, to ensure access
     * to the mobile device keyboard.
     */
    enableFilter?: boolean;

    /**
     * True to render the select control in a full-screen modal dialog when focused.
     * Recommended for use with enableCreate|enableFilter, as we can guarantee the control
     * will be rendered in the top half of the viewport, above the mobile keyboard.
     */
    enableFullscreen?: boolean;

    /**
     * Optional override for fullscreen z-index. Useful for enabling fullscreen from
     * within components that have a higher z-index.
     */
    fullScreenZIndex?: number;

    /**
     * Function called to filter available options for a given query string input.
     * Used for filtering of options provided by `options` prop when `enableFilter` is true.
     * Not to be confused with `queryFn` prop, used in asynchronous mode.
     *
     * Provided function should take an option and a query value and return a boolean.
     * Defaults to a case-insensitive match on word starts.
     */
    filterFn?: (opt: SelectOption, inputVal: string) => boolean;

    /** True to hide the dropdown indicator, i.e. the down-facing arrow at the right of the Select. */
    hideDropdownIndicator?: boolean;

    /** True to suppress the default check icon rendered for the currently selected option. */
    hideSelectedOptionCheck?: boolean;

    /** True to hide options in the drop down menu if they have been selected.*/
    hideSelectedOptions?: boolean;

    /** Field on provided options for sourcing each option's display text (default `label`). */
    labelField?: string;

    /** Function to return loading message during an async query. Passed current query input. */
    loadingMessageFn?: (query: string) => string;

    /** Maximum height of the menu before scrolling. Defaults to 300px. */
    maxMenuHeight?: number;

    /** Placement of the dropdown menu relative to the input control. */
    menuPlacement?: 'auto' | 'top' | 'bottom';

    /** Width in pixels for the dropdown menu - if unspecified, defaults to control width. */
    menuWidth?: number;

    /** Function to return message indicating no options loaded. Passed current query input. */
    noOptionsMessageFn?: (query: string) => string;

    /** True to auto-open the dropdown menu on input focus. */
    openMenuOnFocus?: boolean;

    /**
     * Function to render options in the dropdown list. Called for each option object (which
     * will contain at minimum a value and label field, as well as any other fields present in
     * the source objects).
     */
    optionRenderer?: (SelectOption) => ReactNode;

    /**
     * Preset list of options for selection. Elements can be either a primitive or an object.
     * Primitives will be displayed via toString().
     * Objects must have either:
     *      + A `label` property for display and a `value` property
     *      + A `label` property and an `options` property containing an array of sub-options
     *        to be grouped beneath the option. These sub-options must be either primitives or
     *        `label`:`value` pairs. Deeper nesting is unsupported.
     *
     * See also `queryFn` to  supply options via an async query (i.e. from the server) instead
     * of up-front in this prop.
     */
    options?: Array<SelectOption | any>;

    /** Text to display when control is empty. */
    placeholder?: string;

    /** Delay (in ms) to buffer calls to the async queryFn. Defaults to 300.*/
    queryBuffer?: number;

    /**
     * Async function to return a list of options for a given query string input.
     * Replaces the `options` prop - use one or the other.
     *
     * For providing external (e.g. server-side) options based on user inputs. Not to be
     * confused with `filterFn`, which should be used to filter through local options when
     * not in async mode.
     *
     * Provided function should take a query value and return a Promise resolving to a
     * list of options.
     */
    queryFn?: (query: string) => Promise<SelectOption[]>;

    /**
     * Escape-hatch props passed directly to react-select. Use with care - not all props
     * in the react-select API are guaranteed to be supported by this Hoist component,
     * and providing them directly can interfere with the implementation of this class.
     */
    rsOptions?: PlainObject;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** Text to display in header when in fullscreen mode. */
    title?: string;

    /** Field on provided options for sourcing each option's value (default `value`). */
    valueField?: string;
}
