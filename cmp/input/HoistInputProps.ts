/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {DomAttrsProps, TestSupportProps} from '@xh/hoist/core';

export interface HoistInputProps extends TestSupportProps, DomAttrsProps {
    /**
     * Field or model property name from which this component should read and write its value
     * in controlled mode. Can be set by parent FormField.
     */
    bind?: string;

    /** True to disable user interaction. Can be set by parent FormField. */
    disabled?: boolean;

    /** DOM ID of this input. */
    id?: string;

    /** Called when value changes - passed new and prior values. */
    onChange?: (value: any, oldValue: any) => void;

    /** Called when value is committed to backing model - passed new and prior values. */
    onCommit?: (value: any, oldValue: any) => void;

    /** Tab order for focus control, or -1 to skip. If unset, browser layout-based order. */
    tabIndex?: number;

    /** Value of the control, if provided directly. */
    value?: any;
}

/**
 * Props for text-like inputs that browser password managers may treat as credential fields.
 *
 * Extended by the inputs that render a free-text `<input>` or `<textarea>` - the elements password
 * manager extensions scan. Controls that cannot present as a credential field (checkboxes, sliders,
 * segmented controls, and similar) do not accept this prop.
 */
export interface PasswordManagerSupportProps {
    /**
     * True to allow browser password managers to offer autofill on this input. Defaults to false,
     * suppressing them.
     *
     * Password managers flag any field that *looks* like a username, email, or password and offer
     * a saved-login prompt, whether or not the field has anything to do with signing in. That is
     * unwanted on the ordinary data-entry forms most Hoist applications are built from, so Hoist
     * opts out by default - the same posture as {@link TextInputProps.autoComplete}, which defaults
     * to 'off'. Note `autocomplete="off"` alone does not stop password managers, which have ignored
     * it on login-like fields for years.
     *
     * Set true on genuine credential fields so users get real password manager support.
     */
    enablePasswordManagers?: boolean;
}

/**
 * Vendor-specific attributes that tell a password manager to skip a field. Each manager checks its
 * own attribute - there is no cross-vendor standard. Covers 1Password, LastPass, and Bitwarden.
 *
 * Frozen and module-level so it adds no per-render allocation.
 */
export const PW_MANAGER_IGNORE_ATTRS = Object.freeze({
    'data-1p-ignore': 'true',
    'data-lpignore': 'true',
    'data-bwignore': 'true'
});

/**
 * Resolve the password manager attributes for an input, given its `enablePasswordManagers` prop.
 * Spread onto the element rendering the native `<input>` / `<textarea>`, ahead of any `domAttrs`
 * so an explicit caller attribute wins.
 *
 * Note these must be present in the DOM before a field is first focused - 1Password caches its
 * assessment of a field on first interaction - so apply them during render, never in an effect.
 */
export function getPasswordManagerAttrs(enablePasswordManagers: boolean) {
    return enablePasswordManagers ? null : PW_MANAGER_IGNORE_ATTRS;
}
