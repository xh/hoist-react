import {ReactElement, ReactNode} from 'react';
import {DebounceSettings} from 'lodash';
import {LoadSpec} from '../load';
import {Rule} from '@xh/hoist/data';

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
    hasRole(s: string): boolean;
    hasGate(s: string): boolean;
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
    input?: {
        /**
         * An element specifying a HoistInput, defaults to a platform appropriate TextInput.
         */
        item?: ReactElement,

        /** Validation constraints to apply. */
        rules?: Rule[];

        /** Initial value for the input. */
        initialValue?: any;
    }

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
 * Additional properties passed to this object will be passed directly to the banner component.
 */
export interface BannerSpec {

    message?: ReactNode;
    icon?: ReactElement;
    intent?: 'primary'|'success'|'warning'|'danger',
    className?: string;

    /** The category for the banner. Defaults to 'default'.*/
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
    onClick?(model: any)

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
    omit?: boolean;
}

/**
 * Options for tracking activity on the server via TrackService.
 */
export interface TrackOptions {

    /** Short description of the activity being tracked. */
    message: string;

    /** App-supplied category.*/
    category?: string;

    /** App-supplied data to save along with track log.*/
    data?: object|object[];

    /**
     * Flag to indicate relative importance of activity.
     * Default 'INFO'. Note, errors should be tracked via `XH.handleException()`, which
     * will post to the server for dedicated logging if requested. {@see ExceptionHandler}
     */
    severity?: string;

    /**
     * Set to true to log this message only once during the current session.
     * The unique key identifying this message for this purpose will be
     * comprised of the category and the message.
     */
    oncePerSession?: boolean;

    /** Optional LoadSpec associated with this track.*/
    loadSpec?: LoadSpec;

    /** Elapsed time (ms) for action. */
    elapsed?: number;

    /** Optional flag to omit sending message. */
    omit?: boolean;

}