import {
    HoistModel,
    LoadSpec,
    managed,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    TaskObserver,
    ViewManagerProvider,
    XH
} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, throwIf} from '@xh/hoist/utils/js';
import {isEqual, isNil, lowerCase, startCase} from 'lodash';
import {runInAction} from 'mobx';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {buildViewTree} from './impl/BuildViewTree';
import {View, ViewTree} from './Types';
import {wait} from '@xh/hoist/promise';

export interface ViewManagerConfig {
    /**
     * True (default) to allow the user to select a "Default" option that restores all persisted
     * objects to their in-code defaults. If not enabled, at least one saved view should be created
     * in advance, so that there is a clear initial selection for users without any private views.
     */
    enableDefault?: boolean;
    /** True (default) to allow user to mark views as favorites. Requires `persistWith`. */
    enableFavorites?: boolean;
    /**
     * True to allow the user to publish or edit the global views. Apps are expected to
     * commonly set this based on user roles - e.g. `XH.getUser().hasRole('MANAGE_GRID_VIEWS')`.
     */
    manageGlobal?: boolean;

    /** Used to persist the user's last selected + favorite views and autoSave preference. */
    persistWith?: PersistOptions;
    /**
     * Required discriminator for the particular class of views to be loaded and managed by this
     * model. Maps onto the `type` field of the persisted `JsonBlob`. Set to something descriptive
     * and specific enough to be identifiable and allow for different viewManagers to be added
     * to your app in the future - e.g. `portfolioGridView` or `tradeBlotterDashboard`.
     */
    viewType: string;

    /**
     * Optional user-facing display name for the view type, displayed in the ViewManager menu
     * and associated management dialogs and prompts. Defaulted from `viewType` if not provided.
     */
    typeDisplayName?: string;

    /**
     * Optional user-facing display name for describing global views. Defaults to 'global'
     */
    globalDisplayName?: string;
}

/**
 *  ViewManagerModel coordinates the loading, saving, and management of user-defined bundles of
 *  {@link Persistable} component/model state.
 *
 *  - Models to be persisted are bound to this model via their `persistWith` config. One or more
 *    models can be bound to a single ViewManagerModel, allowing a single view to capture the state
 *    of multiple components - e.g. grouping and filtering options along with grid state.
 *  - Views are persisted back to the server as JsonBlob objects.
 *  - Views can be private to their owner, or optionally enabled for global use by (all) other users.
 *  - Views can be marked as favorites for quick access.
 *  - See the desktop {@link ViewManager} component - the initial Hoist UI for this model.
 */
export class ViewManagerModel<T extends PlainObject = PlainObject>
    extends HoistModel
    implements Persistable<ViewManagerModelPersistState>
{
    /**
     * Factory to create new instances of this model and await its initial load before binding to
     * any persistable component models. This ensures that bound models will have the expected
     * initial persisted state applied within their constructor, before their components have
     * rendered, and avoids thrashing of component state during initial load.
     *
     * To minimize the impact this async requirement has on the design and lifecycle of individual
     * components within an app, consider eagerly constructing any viewManagerModels required within
     * your `AppModel.initAsync` method and saving a reference to them there for component models
     * to then use when they are mounted. The VM model instances will then be "ready to go" and
     * usable within model constructors. (Initializing and referencing from one or more app
     * services would be another, similar option.)
     */
    static async createAsync(config: ViewManagerConfig): Promise<ViewManagerModel> {
        const ret = new ViewManagerModel(config);
        await ret.loadAsync();
        return ret;
    }

    /** Immutable configuration for this model. */
    readonly viewType: string;
    readonly typeDisplayName: string;
    readonly globalDisplayName: string;
    readonly enableDefault: boolean;
    readonly enableFavorites: boolean;
    readonly manageGlobal: boolean;

    /** Last fully-persisted state of the active view. */
    @observable.ref value: T = {} as T;
    /** Current state of the active view, can include not-yet-persisted changes. */
    @observable.ref pendingValue: T = {} as T;
    /** Loaded saved view definitions - both private and global */
    @observable.ref views: View<T>[] = null;

    /** Currently selected view, or null if in default mode. Only token will be set before loading.*/
    @observable.ref selectedView: View<T> = null;

    /** List of tokens for the user's favorite views. */
    @bindable favorites: string[] = [];

    /**
     * TaskObserver linked to {@link selectViewAsync}. If a change to the active view is likely to
     * require intensive layout/grid work, consider masking affected components with this observer.
     */
    viewSelectionObserver: TaskObserver;

    @observable manageDialogOpen = false;
    @managed readonly saveDialogModel: SaveDialogModel;

    /**
     * @internal array of {@link ViewManagerProvider} instances bound to this model. Providers will
     * push themselves onto this array when constructed with a reference to this model. Used to
     * proactively push state to the target components when the model's selected `value` changes.
     */
    providers: ViewManagerProvider<any>[] = [];

    @observable private isInitialized: boolean = false;
    private initialPersistState: PersistableState<ViewManagerModelPersistState> =
        new PersistableState({
            selected: {token: null, lastUpdated: null, pending: null},
            favorites: this.favorites
        });

    @computed
    get canSave(): boolean {
        const {loadModel, selectedView, manageGlobal} = this;
        return !loadModel.isPending && selectedView && (manageGlobal || !selectedView.isGlobal);
    }

    @computed
    get isDirty(): boolean {
        return !isEqual(this.pendingValue, this.value);
    }

    get favoriteViews(): View<T>[] {
        return this.views.filter(it => it.isFavorite);
    }

    get globalViews(): View<T>[] {
        return this.views.filter(it => it.isGlobal);
    }

    get privateViews(): View<T>[] {
        return this.views.filter(it => !it.isGlobal);
    }

    get globalViewTree(): ViewTree[] {
        return buildViewTree(this.globalViews, this);
    }

    get privateViewTree(): ViewTree[] {
        return buildViewTree(this.privateViews, this);
    }

    /**
     * Use the static {@link createAsync} factory to create an instance of this model and await its
     * initial load before binding to persistable components.
     */
    private constructor({
        viewType,
        typeDisplayName,
        globalDisplayName = 'global',
        persistWith,
        manageGlobal = false,
        enableDefault = true,
        enableFavorites = true
    }: ViewManagerConfig) {
        super();
        makeObservable(this);

        throwIf(!viewType, 'Missing required viewType in ViewManagerModel config.');
        this.viewType = viewType;
        this.typeDisplayName = lowerCase(typeDisplayName ?? genDisplayName(viewType));
        this.globalDisplayName = globalDisplayName;
        this.manageGlobal = executeIfFunction(manageGlobal) ?? false;
        this.enableDefault = enableDefault;
        this.enableFavorites = enableFavorites && !!persistWith;
        this.saveDialogModel = new SaveDialogModel(this);

        this.viewSelectionObserver = TaskObserver.trackLast({
            message: `Updating ${this.typeDisplayName}...`
        });

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'viewManager',
                    ...persistWith
                },
                target: this
            });
        }

        this.addReaction({
            track: () => this.favorites,
            run: () => this.onFavoritesChange()
        });
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const rawViews = await XH.jsonBlobService.listAsync({
            type: this.viewType,
            includeValue: false,
            loadSpec
        });
        if (loadSpec.isStale) return;

        runInAction(() => {
            this.views = rawViews.map(it => this.processRaw(it));
        });

        if (!this.isInitialized) {
            await this.initializeAsync();
            runInAction(() => {
                this.isInitialized = true;
            });
        } else if (this.selectedView) {
            // Re-round trip current view, in case it was updated/deleted?  Overkill?
            const {selectedView} = this;
            await this.setViewAsync(selectedView.token, {
                token: selectedView.token,
                pendingValue: this.pendingValue,
                lastUpdated: selectedView.lastUpdated
            });
        }
    }

    private async initializeAsync(): Promise<void> {
        const {enableDefault, initialPersistState, views} = this,
            initialState = initialPersistState?.value;

        this.favorites = initialState.favorites ?? [];

        initialState.selected
            ? await this.setViewAsync(initialState.selected.token, initialState.selected)
            : await this.setViewAsync(enableDefault ? null : views[0]?.token);
    }

    async selectViewAsync(token: string): Promise<void> {
        await this.setViewAsync(token);
    }

    //------------------------
    // Saving/resetting
    //------------------------
    async saveAsync(): Promise<void> {
        const {canSave, pendingValue, selectedView, typeDisplayName} = this;
        throwIf(!canSave, 'Unable to save view.');

        if (selectedView?.isGlobal) {
            if (!(await this.confirmSaveForGlobalViewAsync())) return;
        }

        try {
            await XH.jsonBlobService.updateAsync(selectedView.token, {value: pendingValue});
            runInAction(() => {
                this.value = this.pendingValue;
            });
            XH.successToast(`${startCase(typeDisplayName)} successfully saved.`);
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
    }

    async saveAsAsync(): Promise<void> {
        const {selectedView, views, typeDisplayName} = this,
            {name, description} = selectedView ?? {};

        const newView = await this.saveDialogModel.openAsync(
            {
                name,
                description,
                value: this.pendingValue
            },
            views.map(it => it.name)
        );

        if (newView) {
            await this.refreshAsync();
            await this.setViewAsync(newView.token);
            XH.successToast(`${startCase(typeDisplayName)} successfully saved.`);
        }
    }

    async resetAsync(): Promise<void> {
        await this.setViewAsync(this.selectedView?.token);
    }

    @action
    setPendingValue(pendingValue: T) {
        pendingValue = this.cleanValue(pendingValue);
        if (!isEqual(pendingValue, this.pendingValue)) {
            this.pendingValue = pendingValue;
        }
    }

    @action
    openManageDialog() {
        this.manageDialogOpen = true;
    }

    @action
    closeManageDialog() {
        this.manageDialogOpen = false;
    }

    //------------------
    // Favorites
    //------------------
    toggleFavorite(token: string) {
        this.isFavorite(token) ? this.removeFavorite(token) : this.addFavorite(token);
    }

    addFavorite(token: string) {
        this.favorites = [...this.favorites, token];
    }

    removeFavorite(token: string) {
        this.favorites = this.favorites.filter(it => it !== token);
    }

    isFavorite(token: string) {
        return this.favorites.includes(token);
    }

    //------------------
    // Persistable
    //------------------
    getPersistableState(): PersistableState<ViewManagerModelPersistState> {
        if (!this.isInitialized) {
            return this.initialPersistState;
        }

        const state: ViewManagerModelPersistState = {
            selected: {
                token: this.selectedView?.token,
                lastUpdated: this.selectedView?.lastUpdated,
                pending: this.isDirty ? this.pendingValue : null
            }
        };
        if (this.enableFavorites) {
            state.favorites = this.favorites;
        }

        return new PersistableState(state);
    }

    setPersistableState(state: PersistableState<ViewManagerModelPersistState>) {
        if (!this.isInitialized) {
            this.initialPersistState = state;
            return;
        }

        // Note that don't expect to get here. Unless this component itself managed by
        // ViewManager, the persistable state will be set just once.
        const {selected, favorites} = state.value;
        if (selected) {
            this.setViewAsync(selected.token, selected);
        }
        if (favorites && this.enableFavorites) {
            this.favorites = favorites;
        }
    }

    //------------------
    // Implementation
    //------------------
    private async setViewAsync(token: string, persistedInfo: PlainObject = null) {
        wait()
            .then(async () => {
                let view: View<T> = null;

                // 0) Get latest copy of requested view if any
                if (token != null) {
                    try {
                        const raw = await XH.jsonBlobService.getAsync(token);
                        view = this.processRaw(raw);
                    } catch (e) {
                        if (this.enableDefault) {
                            XH.handleException(e, {showAlert: false});
                            view = null;
                        } else {
                            throw e;
                        }
                    }
                }

                // 1) We now have a token and a view, potentially overlay pending state
                let persistedPending: T = null;
                if (
                    persistedInfo?.pending &&
                    persistedInfo?.token == view?.token &&
                    persistedInfo?.lastUpdated == view?.lastUpdated
                ) {
                    persistedPending = persistedInfo.pending;
                }

                runInAction(() => {
                    this.selectedView = view;

                    const value = this.cleanValue(view ? view.value : ({} as T)),
                        pendingValue = this.cleanValue(persistedPending ?? value);

                    if (isEqual(value, this.value) && isEqual(pendingValue, this.pendingValue))
                        return;

                    this.value = value;
                    this.pendingValue = pendingValue;
                    this.providers.forEach(it => it.pushStateToTarget());
                });
            })
            .linkTo(this.viewSelectionObserver);
    }

    private processRaw(raw: PlainObject): View<T> {
        const isGlobal = raw.acl === '*';
        return {
            ...raw,
            shortName: raw.name?.substring(raw.name.lastIndexOf('\\') + 1),
            isGlobal,
            isFavorite: this.isFavorite(raw.token)
        } as View<T>;
    }

    // Stringify and parse to ensure that any value set here is valid, serializable JSON.
    private cleanValue(value: T): T {
        if (isNil(value)) value = {} as T;
        return JSON.parse(JSON.stringify(value));
    }

    private async confirmSaveForGlobalViewAsync() {
        return XH.confirm({
            message: `You are saving a ${this.globalDisplayName} ${this.typeDisplayName}. Do you wish to continue?`,
            confirmProps: {
                text: 'Yes, save changes',
                intent: 'primary',
                outlined: true
            },
            cancelProps: {
                text: 'Cancel',
                autoFocus: true
            }
        });
    }

    // Update flag on each view, replacing entire views collection for observability.
    private onFavoritesChange() {
        this.views = this.views.map(view => ({
            ...view,
            isFavorite: this.isFavorite(view.token)
        }));
    }
}

interface ViewManagerModelPersistState {
    selected: PlainObject;
    favorites?: string[];
}
