/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {BaseFieldConfig} from '@xh/hoist/cmp/form/field/BaseFieldModel';
import {RuleLike} from '@xh/hoist/data';
import {isNil, isString} from 'lodash';
import {isValidElement, MouseEvent, ReactElement, ReactNode} from 'react';
import {Intent, Thunkable} from './Types';

//------------------------
// Identity
//------------------------
/**
 * A user of the application, as loaded from the server.
 *
 * Note that instances of this class may contain other custom properties serialized by an
 * application. Applications may wish to extend this interface.
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
 * Identity of the authenticated user using the application, along with any user being impersonated.
 */
export interface IdentityInfo {
    /** Actual underlying user that has authenticated in the app. */
    authUser: HoistUser;

    /** User the app should be displayed for. Same as authUser except during impersonation. */
    apparentUser: HoistUser;
}

//------------------------
// Application
//------------------------
/**
 * Options governing XH.reloadApp().
 */
export interface ReloadAppOptions {
    /** Relative path to reload (e.g. 'mobile/'). Defaults to the existing location pathname. */
    path?: string;

    /** Should the query parameters be removed from the url before reload. Default false. */
    removeQueryParams?: boolean;
}

/**
 * Specification for a single user-configurable option shown in the app's Options dialog. Binds a
 * form field to a getter/setter (often a preference) and controls whether changes trigger an app
 * reload or refresh.
 */
export interface AppOptionSpec {
    name: string;
    prefName?: string;

    /** Config for FormField for this option. */
    formField: any;

    /** Config for FieldModel for the option. */
    fieldModel?: Omit<BaseFieldConfig, 'name'>;

    /** Function, possibly async, which returns the value. */
    valueGetter?: () => any;

    /** Function, possibly async, which sets the value. */
    valueSetter?: (s: any) => any;

    /** True to reload the app after changing this option. Default false. */
    reloadRequired?: boolean;

    /**
     * True (default) to refresh the app after changing this option.
     *
     * Set to false for options that take effect immediately without requiring a full app
     * refresh (e.g. visual options unrelated to data). Ignored if `reloadRequired` is true.
     */
    refreshRequired?: boolean;

    /** Optional flag to omit displaying option. */
    omit?: Thunkable<boolean>;
}

//------------------------
// Overlays & Feedback
//------------------------
/**
 * Options for showing a "toast" notification that appears and then automatically dismisses.
 */
export interface ToastSpec {
    message: ReactNode;
    icon?: ReactElement;
    intent?: Intent;

    /**
     * Time in ms to show before auto-dismissing the toast, or null to keep toast visible until
     * manually dismissed. Default 3000.
     */
    timeout?: number;

    /**
     * If provided, will render a button within the toast to enable the user to take some specific
     * action right from the toast.
     */
    actionButtonProps?: any;

    /**
     * Relative position at which to display toast, e.g. "bottom-right" (default) or "top".
     * (Desktop only.)
     */
    position?: string;

    /**
     * DOM element relative to which the toast should be positioned. If null, Toast will show along
     * edge of overall document. (Desktop only.)
     */
    containerRef?: HTMLElement;
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
     * Determines order in which banner will be displayed. If not provided, banner will be placed
     * below any existing banners.
     * @see BannerModel.BANNER_SORTS
     */
    sortOrder?: number;

    /**
     * Showing a banner with a given category will hide any preexisting banner with the same
     * category.
     */
    category?: string;

    /**
     * Callback function triggered when the user clicks the close button. (Note, banners closed via
     * `XH.hideBanner()` or when the max number of banners shown is exceeded will NOT trigger this
     * callback.)
     */
    onClose?: (model: any) => void;

    /** Callback function triggered when the user clicks on the banner. */
    onClick?: (model: any) => void;

    /**
     * If provided, will render a button within the banner to enable the user to take some specific
     * action right from the banner.
     */
    actionButtonProps?: object;

    /** Enable the Banner to be closed? Defaults to true. */
    enableClose?: boolean;
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
     * Unique key identifying the message. If subsequent messages are triggered with this key, they
     * will replace this message. Useful for usages that may be producing messages recursively, or
     * via timers, and wish to avoid generating a large stack of duplicates.
     *
     * Also identifies the message for suppression purposes - required if `suppress` is set.
     */
    messageKey?: string;

    /** Config for input to be displayed (as a prompt). */
    input?: MessageSpecInput;

    /**
     * True or config to display a "Don't show this message again" checkbox, allowing users to
     * opt out of future copies of this message. If the user confirms the message with the
     * checkbox checked, their response will be saved to browser storage and returned
     * immediately by future calls with the same `messageKey` (which must also be set).
     *
     * Specify as a config object to customize the checkbox label, limit how long the saved
     * response should remain in effect, or save it to session (vs. local) storage.
     */
    suppress?: boolean | MessageSuppressSpec;

    /** If specified, user will be required to type this text when confirming. */
    extraConfirmText?: string;

    /**
     * Text/label to inform the user of the text required to confirm. Only used if extraConfirmText
     * is specified. Defaults to `Type '${extraConfirmText}' to confirm:`.
     */
    extraConfirmLabel?: ReactNode;

    /**
     * Props for primary confirm button. Must provide either text or icon for button to be
     * displayed, or use a preconfigured helper such as `XH.alert()` or `XH.confirm()` for default
     * buttons.
     */
    confirmProps?: MessageButtonSpec;

    /**
     * Props for secondary cancel button. Must provide either text or icon for button to be
     * displayed, or use a preconfigured helper such as `XH.alert()` or `XH.confirm()` for default
     * buttons.
     */
    cancelProps?: MessageButtonSpec;

    /**
     * Specify 'left' to place the Cancel button (if shown) on the left edge of the dialog toolbar,
     * with a filler between it and Confirm.
     */
    cancelAlign?: any;

    /** Callback to execute when confirm is clicked. */
    onConfirm?: () => void;

    /** Callback to execute when cancel is clicked. */
    onCancel?: () => void;

    /** Flag to specify whether a popup can be clicked out of or escaped. */
    dismissable?: boolean;

    /** Flag to specify whether onCancel is executed when clicking out of or escaping a popup. */
    cancelOnDismiss?: boolean;
}

export interface MessageSpecInput {
    /** An element specifying a HoistInput, defaults to a platform appropriate TextInput. */
    item?: ReactElement;

    /** Validation constraints to apply. */
    rules?: RuleLike[];

    /** Initial value for the input. */
    initialValue?: any;
}

/**
 * Props for a button shown in a modal message - see {@link MessageSpec.confirmProps} and
 * {@link MessageSpec.cancelProps}. The button is displayed only if `text` or `icon` is set.
 *
 * Extra props pass through to the platform `button` component, e.g. `outlined` or `minimal`.
 * Do not set `onClick` - it is ignored in favor of the message's built-in handlers. Use
 * {@link MessageSpec.onConfirm} and {@link MessageSpec.onCancel} instead.
 */
export interface MessageButtonSpec {
    /** Label for the button. */
    text?: ReactNode;

    /** Icon for the button. */
    icon?: ReactElement;

    /** Visual intent for the button, e.g. 'danger' for a destructive action. */
    intent?: Intent;

    /**
     * True to focus this button when the message opens. If neither button sets this and the
     * message has no `input`, the confirm button is focused by default.
     */
    autoFocus?: boolean;

    /** Other props for the platform `button` component. */
    [key: string]: any;
}

/**
 * Config for user opt-in message suppression - see {@link MessageSpec.suppress}.
 */
export interface MessageSuppressSpec {
    /**
     * Time (in ms) for which the user's saved response should remain in effect. Specify with
     * datetime constants, e.g. `30 * DAYS`. Default null suppresses indefinitely.
     */
    expiry?: number;

    /**
     * Browser storage in which the user's response should be saved (default 'local'). Specify
     * 'session' to suppress only for the lifetime of the current browser tab.
     */
    storage?: 'local' | 'session';

    /** Label for the suppress checkbox. Defaults to a generated label appropriate to `expiry`. */
    label?: ReactNode;

    /** Initial value of the suppress checkbox (default false). */
    initialValue?: boolean;
}

//------------------------
// Menus
//------------------------
/**
 * The base `MenuToken` type. '-' is interpreted as the standard textless divider. Components will
 * likely extend this type to support other strings like 'copyToClipboard', 'print', etc. which the
 * component then converts into a {@link MenuItem}.
 */
export type MenuToken = '-';

/**
 * `MenuContext` is the set of contextual arguments passed to a {@link MenuItem}'s `actionFn` and
 * `prepareFn`. `contextMenuEvent` is the right click event that opened the context menu. It is
 * optional because the `contextMenu` component can also be used on popover buttons, where there is
 * no `contextMenuEvent`.
 *
 * Components offering a built-in {@link contextMenu} can extend `MenuContext` to add values
 * relevant to the component. See for example {@link ChartMenuContext}.
 */
export interface MenuContext {
    contextMenuEvent?: MouseEvent | PointerEvent;
}

/**
 * Basic interface for a MenuItem to appear in a menu.
 *
 * MenuItems can be displayed within a context menu, or shown when clicking on a button.
 */
export interface MenuItem<T = MenuToken, C = MenuContext> {
    /** Label to be displayed. */
    text: ReactNode;

    /** Icon to be displayed. */
    icon?: ReactElement;

    /** Intent to be used for rendering the menu item. */
    intent?: Intent;

    /** Css class name to be added when rendering the menu item. */
    className?: string;

    /** Executed when the user clicks the menu item. */
    actionFn?: (e: MouseEvent | PointerEvent, context?: C) => void;

    /** Executed before the item is shown. Use to adjust properties dynamically. */
    prepareFn?: (me: MenuItem<T, C>, context?: C) => void;

    /** Child menu items. */
    items?: MenuItemLike<T, C>[];

    /** True to disable this item. */
    disabled?: boolean;

    /** True to render this item as active - e.g. to mark the current selection. */
    active?: boolean;

    /** True to hide this item. May be set dynamically via prepareFn. */
    hidden?: boolean;

    /** True to skip this item. May be set dynamically via prepareFn. Alias for hidden. */
    omit?: Thunkable<boolean>;
}

/**
 * A non-interactive heading that labels and visually groups the items below it within a menu.
 *
 * A heading draws its own divider rule, so it needs no adjacent '-' token. Hoist drops a heading
 * with no items below it, either at the end of a menu or immediately before another heading. It
 * also drops any separator directly adjacent to a heading.
 *
 * Grid context menus accept a heading via {@link GridContextMenuItemLike}. The desktop and mobile menus
 * that take {@link MenuItemLike} accept one too.
 */
export interface MenuHeading<C = MenuContext> {
    /** Text to display. May be overridden by `displayFn`. */
    heading: ReactNode;

    /** Css class name to be added when rendering the heading. */
    className?: string;

    /** True to hide this heading. May be set dynamically via `displayFn`. */
    hidden?: boolean;

    /** True to skip this heading. Alias for hidden. */
    omit?: Thunkable<boolean>;

    /**
     * Function called before each render, to add or override display properties. Use it for
     * dynamic control of the heading.
     *
     * The context differs by menu. A grid context menu supplies the same `ActionFnData` that it
     * passes to a RecordAction's own `displayFn`, including the clicked `record` and the current
     * `selectedRecords`. A menu with no contextual data, such as a dropdown on a button, calls
     * this function with no argument.
     */
    displayFn?: (context?: C) => Partial<MenuHeading<C>>;
}

/**
 * An item that can exist in a Menu.
 *
 * Components may accept token strings - in addition, '-' will be interpreted as the standard
 * textless divider that will also be de-duped if appearing at the beginning, or end, or adjacent
 * to another divider at render time. Also allows for a ReactNode for flexible display.
 */
export type MenuItemLike<T = MenuToken, C = MenuContext> =
    MenuItem<T, C> | MenuHeading<C> | T | ReactElement;

/**
 * A context menu is specified as an array of items, a function to generate one from a click, or a
 * full element representing a contextMenu Component.
 */
export type ContextMenuSpec<T = MenuToken, C = MenuContext> =
    | MenuItemLike<T, C>[]
    | ((e: MouseEvent | PointerEvent, context: C) => MenuItemLike<T, C>[])
    | boolean;

export function isMenuItem<T, C>(item: MenuItemLike<T, C>): item is MenuItem<T, C> {
    return !isString(item) && !isValidElement(item) && !isMenuHeading(item);
}

export function isMenuHeading<C>(item: any): item is MenuHeading<C> {
    return !isString(item) && !isValidElement(item) && !isNil(item) && 'heading' in item;
}

//------------------------
// Inputs
//------------------------
/**
 * An option to be passed to Select controls.
 *
 * Additional custom fields are supported alongside the standard entries below and are passed
 * through to callbacks such as `optionRenderer` and `filterFn`. For typed access to such fields,
 * annotate the callback's argument with the app's own option type - e.g.
 * `optionRenderer: (opt: MyOption) => ...`.
 */
export interface SelectOption {
    value?: any;
    label?: string;
    options?: (SelectOption | any)[];

    /** Custom fields, passed through to Select callbacks. */
    [key: string]: any;
}
