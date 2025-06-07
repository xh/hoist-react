/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {RuleLike} from '@xh/hoist/data';
import {MouseEvent, ReactElement, ReactNode, isValidElement} from 'react';
import {isString} from 'lodash';
import {LoadSpec} from '../load';
import {Intent, PlainObject, Thunkable} from './Types';

/**
 * User of the application, as loaded from the server.
 *
 * Note that instances of this class may contain other custom properties serialize by an
 * application.  Applications may wish to extend this interface
 */
export interface HoistUser {
    username: string;
    email: string;
    displayName: string;
    roles: string[];
    isHoistAdmin: boolean;
    isHoistAdminReader: boolean;
    isHoistRoleManager: boolean;
    hasRole(s: string): boolean;
    hasGate(s: string): boolean;
}

/**
 * Options governing XH.reloadApp().
 */
export interface ReloadAppOptions {
    /** Relative path to reload (e.g. 'mobile/').  Defaults to the existing location pathname. */
    path?: string;

    /** Should the query parameters be removed from the url before reload.  Default false. */
    removeQueryParams?: boolean;
}

/**
 * Options for showing a "toast" notification that appears and then automatically dismisses.
 */
export interface ToastSpec {
    message: ReactNode;
    icon?: ReactElement;
    intent?: Intent;

    /**
     * Time in ms to show before auto-dismissing the toast, or null to keep toast
     * visible until manually dismissed.  Default 3000.
     */
    timeout?: number;

    /**
     * If provided, will render a button within the toast to enable the user to take some
     * specific action right from the toast.
     */
    actionButtonProps?: any;

    /**
     * Relative position at which to display toast, e.g. "bottom-right" (default) or "top".
     * (Desktop only.)
     */
    position?: string;

    /**
     * DOM element relative to which the toast should be positioned. If null, Toast will show
     * along edge of overall document. (Desktop only.)
     */
    containerRef?: HTMLElement;
}

/**
 * Options for showing a modal alert, confirm, or prompt.
 */
export interface MessageSpec {
    message?: ReactNode;
    title?: string;
    icon?: ReactElement;
    className?: string;

    /**
     * Unique key identifying the message. If subsequent messages.
     * If subsequent messages are triggered with this key, they will replace this message.
     * Useful for usages that may be producing messages recursively, or via timers and wish to
     * avoid generating a large stack of duplicates.
     */
    messageKey?: string;

    /** Config for input to be displayed (as a prompt). */
    input?: {
        /** An element specifying a HoistInput, defaults to a platform appropriate TextInput. */
        item?: ReactElement;

        /** Validation constraints to apply. */
        rules?: RuleLike[];

        /** Initial value for the input. */
        initialValue?: any;
    };

    /**
     * Props for primary confirm button.
     * Must provide either text or icon for button to be displayed, or use a preconfigured
     * helper such as `XH.alert()` or `XH.confirm()` for default buttons.
     */
    confirmProps?: any;

    /**
     * Props for secondary cancel button.
     * Must provide either text or icon for button to be displayed, or use a preconfigured
     * helper such as `XH.alert()` or `XH.confirm()` for default buttons.
     */
    cancelProps?: any;

    /**
     * Specify 'left' to place the Cancel button (if shown) on the
     * left edge of the dialog toolbar, with a filler between it and Confirm.
     */
    cancelAlign?: any;

    /** Callback to execute when confirm is clicked.*/
    onConfirm?();

    /** Callback to execute when cancel is clicked.*/
    onCancel?();

    /** Flag to specify whether a popup can be clicked out of or escaped.*/
    dismissable?: boolean;

    /** Flag to specify whether onCancel is executed when clicking out of or escaping a popup. */
    cancelOnDismiss?: boolean;
}

/**
 * Configuration object for an app-wide banner.
 */
export interface BannerSpec {
    message?: ReactNode;
    icon?: ReactElement;
    intent?: Intent;
    className?: string;

    /**
     * Determines order in which banner will be displayed.
     * If not provided, banner will be placed below any existing banners.
     * @see BannerModel.BANNER_SORTS
     */
    sortOrder?: number;

    /**
     * Showing a banner with a given category will hide any
     * preexisting banner with the same category.
     */
    category?: string;

    /**
     *  Callback function triggered when the user clicks the close button.
     *  (Note, banners closed via `XH.hideBanner()` or when the max
     *  number of banners shown is exceeded will NOT trigger this callback.)
     */
    onClose?(model: any);

    /**
     * Callback function triggered when the user clicks on the banner.
     */
    onClick?(model: any);

    /**
     *  If provided, will render a button within the banner to enable the user to
     *  take some specific action right from the banner.
     */
    actionButtonProps?: object;

    /** Enable the Banner to be closed? Defaults to true. */
    enableClose?: boolean;
}

/**
 * Option for Application option in the application.
 */
export interface AppOptionSpec {
    name: string;
    prefName?: string;

    /** Config for FormField for this option. */
    formField: any;

    /** Config for FieldModel for the option.*/
    fieldModel?: any;

    /** Function, possibly async, which returns the value. */
    valueGetter?: () => any;

    /** Function, possibly async, which sets the value. */
    valueSetter?: (s: any) => any;

    /** True to reload the app after changing this option.  Default false. */
    reloadRequired?: boolean;

    /** Optional flag to omit displaying option. */
    omit?: Thunkable<boolean>;
}

/**
 * Severity levels for tracking.  Default is 'INFO'.
 */
export type TrackSeverity = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Options for tracking activity on the server via TrackService.
 */
export interface TrackOptions {
    /** Short description of the activity being tracked. */
    message: string;

    /** App-supplied category.*/
    category?: string;

    /** Correlation ID to save along with track log. */
    correlationId?: string;

    /** App-supplied data to save along with track log.*/
    data?: PlainObject | PlainObject[];

    /**
     * Set true to log on the server all primitive values in the 'data' property.
     * May also be specified as list of specific property keys that should be logged.
     *
     * Default value for this property may be set in xhActivityTrackingConfig.
     * If no default set, value will be `false` and nothing in data will be logged.
     */
    logData?: boolean | string[];

    /**
     * Flag to indicate relative importance of activity. Default 'INFO'.
     *
     * Allows conditional saving of messages depending on the currently active
     * level configuration for the category/user.  See HoistCore's 'TrackService' for
     * more information.
     *
     * Note, errors should be tracked via {@link XH.handleException}, which
     * will post to the server for dedicated logging if requested.
     */
    severity?: TrackSeverity;

    /**
     * Set to true to log this message only once during the current session. The category and
     * message text will be used as a compound key to identify repeated messages.
     */
    oncePerSession?: boolean;

    /** Optional LoadSpec associated with this track.*/
    loadSpec?: LoadSpec;

    /** Timestamp for action. */
    timestamp?: number;

    /** Elapsed time (ms) for action. */
    elapsed?: number;

    /** Optional flag to omit sending message. */
    omit?: Thunkable<boolean>;
}

export type MenuToken = '-';

export interface MenuContext extends PlainObject {
    contextMenuEvent?: MouseEvent | PointerEvent;
}

/**
 *  Basic interface for a MenuItem to appear in a menu.
 *
 *  MenuItems can be displayed within a context menu, or shown when clicking on a button.
 */
export interface MenuItem<T> {
    /** Label to be displayed. */
    text: ReactNode;

    /** Icon to be displayed. */
    icon?: ReactElement;

    /** Intent to be used for rendering the menu item. */
    intent?: Intent;

    /** Css class name to be added when rendering the menu item. */
    className?: string;

    /** Executed when the user clicks the menu item. */
    actionFn?: (e: MouseEvent | PointerEvent, context?: MenuContext) => void;

    /** Executed before the item is shown.  Use to adjust properties dynamically. */
    prepareFn?: (me: MenuItem<T>, context?: MenuContext) => void;

    /** Child menu items. */
    items?: MenuItemLike<T>[];

    /** True to disable this item. */
    disabled?: boolean;

    /** True to hide this item. May be set dynamically via prepareFn. */
    hidden?: boolean;

    /** True to skip this item. May be set dynamically via prepareFn. Alias for hidden.  */
    omit?: Thunkable<boolean>;
}

/**
 * An item that can exist in a Menu.
 * Components may accept token strings, in addition, '-' will be interpreted as the standard
 * textless divider that will also be de-duped if appearing at the beginning, or end, or adjacent
 * to another divider at render time. Also allows for a ReactNode for flexible display.
 */
export type MenuItemLike<T = MenuToken> = MenuItem<T> | T | ReactElement;

export function isMenuItem<T>(item: MenuItemLike<T>): item is MenuItem<T> {
    return !isString(item) && !isValidElement(item);
}

/**
 * An option to be passed to Select controls
 */
export interface SelectOption {
    value?: any;
    label?: string;
    options?: (SelectOption | any)[];
}
