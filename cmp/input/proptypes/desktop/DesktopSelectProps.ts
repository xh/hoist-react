/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {HoistInputProps} from '@xh/hoist/cmp/input';
import {Awaitable, HoistProps, LayoutProps, PlainObject, SelectOption} from '@xh/hoist/core';
import {ReactElement, ReactNode} from 'react';

export interface DesktopSelectProps extends HoistProps, HoistInputProps, LayoutProps {
    /** True to focus the control on render. */
    autoFocus?: boolean;

    /**
     * Function to return a "create a new option" string prompt. Requires `enableCreate` true.
     * Passed current query input.
     */
    createMessageFn?: (query: string) => string;

    /** True (default) to close the menu after each selection. */
    closeMenuOnSelect?: boolean;

    /** True to show a "clear" button at the right of the control. */
    enableClear?: boolean;

    /** True to accept and commit input values not present in options or returned by a query. */
    enableCreate?: boolean;

    /**
     * True (default) to enable type-to-search keyboard input. False to disable keyboard input,
     * showing the dropdown menu on click.
     */
    enableFilter?: boolean;

    /** True to allow entry/selection of multiple values - "tag picker" style. */
    enableMulti?: boolean;

    /**
     * True to enable tooltips on selected values. Enable when the space
     * available to the select component might not support showing the value's full text.
     */
    enableTooltips?: boolean;

    /**
     * True to use react-windowed-select for improved performance on large option lists.
     * See https://github.com/jacobworrel/react-windowed-select/.
     *
     * Currently only supported when the enableCreate and queryFn props are not specified.
     * These options require the use of specialized 'Async' or 'Creatable' selects from the
     * underlying react-select library which are not fully implemented in react-windowed-select.
     *
     * Applications should use this option with care.
     */
    enableWindowed?: boolean;

    /**
     * Function called to filter available options for a given query string input.
     * Used for filtering of options provided by `options` prop when `enableFilter` is true.
     * Not to be confused with `queryFn` prop, used in asynchronous mode.
     *
     * Provided function should take an option and a query value and return a boolean.
     * Defaults to a case-insensitive match on word starts.
     */
    filterFn?: (opt: SelectOption, inputVal: string) => boolean;

    /**
     * True to hide the dropdown indicator, i.e. the down-facing arrow at the right of the Select.
     * Defaults to true on tablets, false on desktop.
     */
    hideDropdownIndicator?: boolean;

    /** True to suppress the default check icon rendered for the currently selected option. */
    hideSelectedOptionCheck?: boolean;

    /**
     * True to hide options in the drop-down menu if they have been selected.
     * Defaults to same as enableMulti.
     */
    hideSelectedOptions?: boolean;

    /** Field on provided options for sourcing each option's display text (default `label`). */
    labelField?: string;

    /** Icon to display inline on the left side of the input. */
    leftIcon?: ReactElement;

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

    /**
     * Delay (in ms) to buffer calls to the async queryFn. Defaults to 300.
     */
    queryBuffer?: number;

    /**
     * Async function to return a list of options for a given query string input.
     * Replaces the `options` prop - use one or the other.
     *
     * For providing external (e.g. server-side) options based on user inputs. Not to be
     * confused with `filterFn`, which should be used to filter through local options when
     * not in async mode.
     */
    queryFn?: (query: string) => Awaitable<Array<SelectOption | any>>;

    /**
     * Escape-hatch props passed directly to react-select. Use with care - not all props
     * in the react-select API are guaranteed to be supported by this Hoist component,
     * and providing them directly can interfere with the implementation of this class.
     */
    rsOptions?: PlainObject;

    /** True to select contents when control receives focus. */
    selectOnFocus?: boolean;

    /** Field on provided options for sourcing each option's value (default `value`). */
    valueField?: string;
}
