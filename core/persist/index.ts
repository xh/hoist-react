export * from './Persistable';
export * from './PersistOptions';
export * from './PersistenceProvider';
export * from './provider/LocalStorageProvider';
export * from './provider/SessionStorageProvider';
export * from './provider/DashViewProvider';
export * from './provider/PrefProvider';
export * from './provider/CustomProvider';
export * from './provider/ViewManagerProvider';

import {PersistenceProvider} from './PersistenceProvider';
import {CustomProvider} from './provider/CustomProvider';
import {DashViewProvider} from './provider/DashViewProvider';
import {LocalStorageProvider} from './provider/LocalStorageProvider';
import {PrefProvider} from './provider/PrefProvider';
import {SessionStorageProvider} from './provider/SessionStorageProvider';
import {ViewManagerProvider} from './provider/ViewManagerProvider';

// Register the built-in providers for lookup by `PersistenceProvider.create`. Registration
// lives here - in a module declared side-effectful via the package `sideEffects` entry and
// reached whenever anything imports from this package - rather than in the base class (which
// must not import its own subclasses - see note on `registerProviders`) or in the provider
// modules themselves (whose registrations would be pruned by a tree-shaking bundler, as
// nothing consumes their exports directly).
PersistenceProvider.registerProviders([
    {type: 'pref', shortcutKeys: ['prefKey'], cls: PrefProvider},
    {type: 'localStorage', shortcutKeys: ['localStorageKey'], cls: LocalStorageProvider},
    {type: 'sessionStorage', shortcutKeys: ['sessionStorageKey'], cls: SessionStorageProvider},
    {type: 'dashView', shortcutKeys: ['dashViewModel'], cls: DashViewProvider},
    {type: 'viewManager', shortcutKeys: ['viewManagerModel'], cls: ViewManagerProvider},
    {type: 'custom', shortcutKeys: ['getData', 'setData'], cls: CustomProvider}
]);
