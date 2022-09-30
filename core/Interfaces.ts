import {ReactElement, ReactNode} from 'react';
// @ts-ignore
import {HTMLElement} from 'dom';
import {DebounceSettings} from "lodash";
import {LoadSpec} from './refresh/LoadSpec';
import {ExceptionHandlerOptions} from "@xh/hoist/core/ExceptionHandler";
import {TaskObserver} from "@xh/hoist/core/TaskObserver";

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
    hasRole(string): boolean;
    hasGate(string): boolean;
}


/**
 * Specification for debouncing in Hoist.
 *
 * When specified as object, should contain an 'interval' and other optional keys for
 * lodash.  If specified as number the default lodash debounce will be used.
 */
export type DebounceSpec = number|(DebounceSettings & {interval: number});

/**
 * Options for showing a "toast" notification that appears and then automatically dismisses.
 */
export interface ToastSpec {
    message: ReactNode;
    icon?: ReactElement;
    intent?: 'primary'|'success'|'warning'|'danger',

    /**
     * Time in ms to show before auto-dismissing the toast, or null to keep toast
     * visible until manually dismissed.  Default 3000.
     */
    timeout?: number;

    /**
     * If provided, will render a button within the toast to enable the user to take some
     * specific action right from the toast.
     */
    actionButtonProps?: object;

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

    message: ReactNode;
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
    input?: object;

    /**
     * Props for primary confirm button.
     * Must provide either text or icon for button to be displayed, or use a preconfigured
     * helper such as `XH.alert()` or `XH.confirm()` for default buttons.
     */
    confirmProps?: object;

    /**
     * Props for secondary cancel button.
     * Must provide either text or icon for button to be displayed, or use a preconfigured
     * helper such as `XH.alert()` or `XH.confirm()` for default buttons.
     */
    cancelProps?: object;

    /**
     * Specify 'left' to place the Cancel button (if shown) on the
     * left edge of the dialog toolbar, with a filler between it and Confirm.
     */
    cancelAlign?: string;

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
 * Additional properties passed to this object will be passed directly to the banner component.
 */
export interface BannerSpec {

    message?: ReactNode;
    icon?: ReactElement;
    intent?: string;
    className?: string;

    /** The category for the banner. Defaults to 'default'.*/
    category?: string;

    /**
     *  Callback function triggered when the user clicks the close button.
     *  (Note, banners closed via `XH.hideBanner()` or when the max
     *  number of banners shown is exceeded will NOT trigger this callback.)
     */
    onClose?(model);

    /**
     *  If provided, will render a button within the banner to enable the user to
     *  take some specific action right from the banner.
     */
    actionButtonProps?: object;
}


/**
 * Options for tracking activity on the server via TrackService.
 */
export interface TrackOptions {
    message?: string;
    category?: string;
    data?: object | object[];
    severity?: string;
    oncePerSession?: boolean;
    loadSpec?: LoadSpec;
    omit?: boolean;
}