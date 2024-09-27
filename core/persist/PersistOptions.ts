/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {DebounceSpec} from '../';
import {PersistenceManagerModel} from './persistenceManager';

/**
 * Options governing persistence.
 */
export interface PersistOptions {
    /** Dot delimited path to store state. */
    path?: string;

    /** Debounce interval in ms, or a lodash debounce config. */
    debounce?: DebounceSpec;

    /**
     * Type of PersistenceProvider to create. If not provided, defaulted based on the presence of
     * `prefKey`, `localStorageKey`, `dashViewModel`, `persistenceManagerModel`, `getData` and `setData`.
     */
    type?: string;

    /** Predefined Hoist application Preference key used to store state. */
    prefKey?: string;

    /** Browser local storage key used to store state. */
    localStorageKey?: string;

    /** DashViewModel used to read / write view state. */
    dashViewModel?: object;

    /** PersistenceManagerModel used to read / write view state. */
    persistenceManagerModel?: PersistenceManagerModel;

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
