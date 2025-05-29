/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {Class} from 'type-fest';
import {DebounceSpec, PersistenceProvider, PersistenceProviderConfig} from '../';
import type {DashViewModel} from '@xh/hoist/desktop/cmp/dash'; // Import type only
import type {ViewManagerModel} from '@xh/hoist/cmp/viewmanager'; // Import type only

/**
 * Built-in Hoist PersistenceProviders.
 */
export type PersistenceProviderType =
    | 'pref'
    | 'localStorage'
    | 'sessionStorage'
    | 'dashView'
    | 'viewManager'
    | 'custom';

export interface PersistOptions {
    /** Dot delimited path to store state. */
    path?: string;

    /** Debounce interval in ms, or a lodash debounce config. */
    debounce?: DebounceSpec;

    /**
     * Delay (in ms) to wait after state has been read before listening for further state changes.
     */
    settleTime?: number;

    /**
     * Type of PersistenceProvider to create. Specify as one of the built-in string types,
     * or a subclass of PersistenceProvider.
     *
     * If not provided, defaulted to one of the built-in string types based on the presence of
     * `prefKey`, `localStorageKey`, `dashViewModel`, 'viewManagerModel', or `getData/setData`.
     */
    type?: PersistenceProviderType | Class<PersistenceProvider, [PersistenceProviderConfig]>;

    /** Predefined Hoist application Preference key used to store state. */
    prefKey?: string;

    /** Browser local storage key used to store state. */
    localStorageKey?: string;

    /** Session (tab-specific) storage key used to store state. */
    sessionStorageKey?: string;

    /** DashViewModel used to read / write view state. */
    dashViewModel?: DashViewModel;

    /** ViewManagerModel used to read / write view state. */
    viewManagerModel?: ViewManagerModel;

    /**
     *  Function returning blob of data to be used for reading state.
     *  Ignored if `prefKey`, `localStorageKey` or `dashViewModel` are provided.
     */
    getData?: () => any;

    /**
     * Function to be used to write blob of data representing state.
     * Ignored if `prefKey`, `localStorageKey` or `dashViewModel` are provided.
     */
    setData?: (data: object) => void;
}
