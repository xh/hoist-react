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
    Thunkable,
    ViewManagerProvider,
    XH
} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, pluralize, throwIf} from '@xh/hoist/utils/js';
import {isEqual, isNil, isUndefined, lowerCase, startCase} from 'lodash';
import {runInAction} from 'mobx';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {buildViewTree} from './impl/BuildViewTree';
import {View, ViewTree} from './Types';

export interface ViewManagerConfig {
    /**
     * True (default) to allow user to opt in to automatically saving changes to their private
     * views - requires `persistWith`.
     */
    enableAutoSave?: boolean;
    /**
     * True (default) to allow the user to select a "Default" option that restores all persisted
     * objects to their in-code defaults. If not enabled, at least one saved view should be created
     * in advance, so that there is a clear initial selection for users without any private views.
     */
    enableDefault?: boolean;
    /** True (default) to allow user to mark views as favorites. Requires `persistWith`. */
    enableFavorites?: boolean;
    /**
     * True to allow the user to publish or edit globally shared views. Apps are expected to
     * commonly set this based on user roles - e.g. `XH.getUser().hasRole('MANAGE_GRID_VIEWS')`.
     */
    enableSharing?: Thunkable<boolean>;
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
    viewTypeDisplayName?: string;
}

/**
 *  ViewManagerModel coordinates the loading, saving, and management of user-defined bundles of
 *  {@link Persistable} component/model state.
 *
 *  - Models to be persisted are bound to this model via their `persistWith` config. One or more
 *    models can be bound to a single ViewManagerModel, allowing a single view to capture the state
 *    of multiple components - e.g. grouping and filtering options along with grid state.
 *  - Views are persisted back to the server as JsonBlob objects.
 *  - Views can be private to their owner, or optionally enabled for sharing to (all) other users.
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
    readonly displayName: string; // from viewTypeDisplayName, or generated off of viewType
    readonly DisplayName: string; // capitalized viewTypeDisplayName
    readonly enableDefault: boolean;
    readonly enableAutoSave: boolean;
    readonly enableFavorites: boolean;

    /** Last selected, fully-persisted state of the active view. */
    @observable.ref value: T = {} as T;
    /** Current state of the active view, can include not-yet-persisted changes. */
    @observable.ref pendingValue: T = {} as T;
    /** Loaded saved view definitions - both private and shared. */
    @observable.ref views: View<T>[] = [];

    /** Currently selected view, or null if in default mode. Token only will be set during pre-loading.*/
    @observable selectedToken: string = null;
    @observable.ref selectedView: View<T> = null;

    /** List of tokens for the user's favorite views. */
    @bindable favorites: string[] = [];
    /**
     * True if user has opted-in to automatically saving changes to personal views (if auto-save
     * generally available as per `enableAutoSave`).
     */
    @bindable autoSave = false;

    /**
     * TaskObserver linked to {@link selectViewAsync}. If a change to the active view is likely to
     * require intensive layout/grid work, consider masking affected components with this observer.
     */
    viewSelectionObserver: TaskObserver;

    @observable manageDialogOpen = false;
    @managed readonly saveDialogModel: SaveDialogModel;

    private readonly _enableSharing: Thunkable<boolean>;

    /**
     * @internal array of {@link ViewManagerProvider} instances bound to this model. Providers will
     * push themselves onto this array when constructed with a reference to this model. Used to
     * proactively push state to the target components when the model's selected `value` changes.
     */
    providers: ViewManagerProvider<any>[] = [];

    get enableSharing(): boolean {
        return executeIfFunction(this._enableSharing);
    }

    @computed
    get canSave(): boolean {
        const {loadModel, selectedView, enableSharing} = this;
        return !loadModel.isPending && selectedView && (enableSharing || !selectedView.isShared);
    }

    @computed
    get canAutoSave(): boolean {
        const {enableAutoSave, autoSave, loadModel, selectedView} = this;
        return (
            enableAutoSave &&
            autoSave &&
            !loadModel.isPending &&
            selectedView &&
            !selectedView.isShared
        );
    }

    @computed
    get autoSaveUnavailableReason(): string {
        const {canAutoSave, selectedView, displayName} = this;
        if (canAutoSave) return null;
        if (!selectedView) return `Cannot auto-save default ${displayName}.`;
        if (selectedView.isShared) return `Cannot auto-save shared ${displayName}.`;
        return null;
    }

    @computed
    get isDirty(): boolean {
        return !isEqual(this.pendingValue, this.value);
    }

    get isShared(): boolean {
        return !!this.selectedView?.isShared;
    }

    get favoriteViews(): View<T>[] {
        return this.views.filter(it => it.isFavorite);
    }

    get sharedViews(): View<T>[] {
        return this.views.filter(it => it.isShared);
    }

    get privateViews(): View<T>[] {
        return this.views.filter(it => !it.isShared);
    }

    get sharedViewTree(): ViewTree[] {
        return buildViewTree(this.sharedViews, this);
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
        viewTypeDisplayName,
        persistWith,
        enableSharing = false,
        enableDefault = true,
        enableAutoSave = true,
        enableFavorites = true
    }: ViewManagerConfig) {
        super();
        makeObservable(this);

        throwIf(!viewType, 'Missing required viewType in ViewManagerModel config.');
        this.viewType = viewType;
        this.displayName = lowerCase(viewTypeDisplayName ?? genDisplayName(viewType));
        this.DisplayName = startCase(this.displayName);

        this._enableSharing = enableSharing;
        this.enableDefault = enableDefault;
        this.enableAutoSave = enableAutoSave && !!persistWith;
        this.enableFavorites = enableFavorites && !!persistWith;
        this.saveDialogModel = new SaveDialogModel(this);

        this.viewSelectionObserver = TaskObserver.trackLast({
            message: `Updating ${this.displayName}...`
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

        this.addReaction(
            {
                // Track pendingValue, so we retry on fail if view stays dirty -- could use backup timer
                track: () => [this.pendingValue, this.autoSave],
                run: () => this.maybeAutoSaveAsync()
            },
            {
                track: () => this.favorites,
                run: () => this.onFavoritesChange()
            }
        );
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        const rawViews = await XH.jsonBlobService.listAsync({type: this.viewType, loadSpec});
        if (loadSpec.isStale) return;

        runInAction(() => {
            this.views = rawViews.map(it => this.processRaw(it));
        });

        const token =
            loadSpec.meta.selectToken ??
            this.selectedToken ??
            (this.enableDefault ? null : this.views[0]?.token);
        await this.selectViewAsync(token);
    }

    async selectViewAsync(token: string) {
        // If views have not been loaded yet (e.g. constructing), nothing to be done but pre-set state
        if (!this.views) {
            this.selectedToken = token;
            return;
        }
        await this.selectViewInternalAsync(token).linkTo(this.viewSelectionObserver);
    }

    //------------------------
    // Saving/resetting
    //------------------------
    async saveAsync() {
        const {canSave, selectedToken, pendingValue, selectedView, DisplayName} = this;
        throwIf(!canSave, 'Unable to save view.');

        if (selectedView?.isShared) {
            if (!(await this.confirmSaveForSharedViewAsync())) return;
        }

        try {
            await XH.jsonBlobService.updateAsync(selectedToken, {value: pendingValue});
            runInAction(() => {
                this.value = this.pendingValue;
            });
            XH.successToast(`${DisplayName} successfully saved.`);
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
    }

    async saveAsAsync() {
        const {selectedView, views, DisplayName} = this,
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
            await this.refreshAsync({selectToken: newView.token});
            XH.successToast(`${DisplayName} successfully saved.`);
        }
    }

    async resetAsync() {
        return this.selectViewAsync(this.selectedView?.token);
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
        const state: ViewManagerModelPersistState = {
            selectedToken: this.selectedToken,
            favorites: this.favorites
        };
        if (this.enableAutoSave) {
            state.autoSave = this.autoSave;
        }
        return new PersistableState(state);
    }

    setPersistableState(state: PersistableState<ViewManagerModelPersistState>) {
        const {selectedToken, favorites, autoSave} = state.value;
        if (!isUndefined(selectedToken)) {
            this.selectViewAsync(selectedToken);
        }
        if (!isUndefined(favorites)) {
            this.favorites = favorites;
        }
        if (!isUndefined(autoSave) && this.enableAutoSave) {
            this.autoSave = autoSave;
        }
    }

    //------------------
    // Implementation
    //------------------
    private async selectViewInternalAsync(token: string) {
        let view: View<T> = null;
        if (token != null) {
            try {
                const raw = await XH.jsonBlobService.getAsync(token);
                view = this.processRaw(raw);
            } catch (e) {
                XH.handleException(e, {showAlert: false});
                view = null;
                token = null;
            }
        }

        runInAction(() => {
            this.selectedToken = token;
            this.selectedView = view;
            this.setValue(this.selectedView?.value ?? ({} as T));
        });
    }

    private processRaw(raw: PlainObject): View<T> {
        const name = pluralize(this.DisplayName);
        const isShared = raw.acl === '*';
        return {
            ...raw,
            shortName: raw.name?.substring(raw.name.lastIndexOf('\\') + 1),
            isShared,
            group: isShared ? `Shared ${name}` : `My ${name}`,
            isFavorite: this.isFavorite(raw.token)
        } as View<T>;
    }

    private setValue(value: T) {
        value = this.cleanValue(value);
        if (isEqual(value, this.value) && isEqual(value, this.pendingValue)) return;

        this.value = this.pendingValue = value;
        this.providers.forEach(it => it.pushStateToTarget());
    }

    // Stringify and parse to ensure that any value set here is valid, serializable JSON.
    private cleanValue(value: T): T {
        if (isNil(value)) value = {} as T;
        return JSON.parse(JSON.stringify(value));
    }

    private async confirmSaveForSharedViewAsync() {
        return XH.confirm({
            message: `You are saving a shared public ${this.displayName}. Do you wish to continue?`,
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

    private async maybeAutoSaveAsync() {
        if (this.canAutoSave && this.isDirty) {
            const {selectedToken, pendingValue} = this;
            try {
                await XH.jsonBlobService.updateAsync(selectedToken, {value: pendingValue});
                runInAction(() => {
                    this.value = this.pendingValue;
                });
            } catch (e) {
                XH.handleException(e, {showAlert: false});
            }
        }
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
    selectedToken?: string;
    favorites?: string[];
    autoSave?: boolean;
}
