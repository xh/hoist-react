import {
    HoistModel,
    LoadSpec,
    managed,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    ReactionSpec,
    TaskObserver,
    Thunkable,
    ViewManagerProvider,
    XH
} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {JsonBlob} from '@xh/hoist/svc';
import {executeIfFunction, throwIf} from '@xh/hoist/utils/js';
import {first, isEmpty, isEqual, isNil, lowerCase, omit, startCase} from 'lodash';
import {runInAction, when} from 'mobx';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {buildViewTree} from './impl/BuildViewTree';
import {View, ViewTree, ViewWithState} from './Types';

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
    manageGlobal?: Thunkable<boolean>;

    /** Used to persist the user's last selected view + favorite views */
    persistWith?: ViewManagerPersistOptions;
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

export interface ViewManagerPersistOptions extends PersistOptions {
    /** False to persist selected view *without* transient state. Default is true. */
    persistTransientState?: boolean;
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
    implements Persistable<ViewManagerModelPersistState<T>>
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
        await ret.initAsync();
        return ret;
    }

    /** Immutable configuration for this model. */
    readonly viewType: string;
    readonly typeDisplayName: string;
    readonly globalDisplayName: string;
    readonly enableDefault: boolean;
    readonly enableFavorites: boolean;
    readonly manageGlobal: boolean;

    /** Last saved view + state. */
    @observable.ref savedValue: ViewWithState<T> = {view: null, state: {}};
    /** Current (transient) view + state, can include not-yet-saved changes. */
    @observable.ref currentValue: ViewWithState<T> = this.savedValue;
    /** Loaded saved view definitions - both private and global */
    @observable.ref views: View[] = [];

    /** List of tokens for the user's favorite views. */
    @bindable favorites: string[] = [];

    /**
     * TaskObserver linked to {@link selectViewAsync}. If a change to the active view is likely to
     * require intensive layout/grid work, consider masking affected components with this observer.
     */
    viewSelectionTask: TaskObserver;

    /**
     * TaskObserver linked to {@link saveAsync}.
     */
    saveTask: TaskObserver;

    @observable manageDialogOpen = false;
    @managed readonly saveDialogModel: SaveDialogModel;

    /**
     * @internal array of {@link ViewManagerProvider} instances bound to this model. Providers will
     * push themselves onto this array when constructed with a reference to this model. Used to
     * proactively push state to the target components when the model's selected `value` changes.
     */
    providers: ViewManagerProvider<any>[] = [];

    declare persistWith: ViewManagerPersistOptions;

    @computed
    get canSave(): boolean {
        const {isLoading, savedValue, manageGlobal} = this,
            {view} = savedValue;
        return !isLoading && view && (manageGlobal || !view.isGlobal);
    }

    @computed
    get isStateDirty(): boolean {
        return !isEqual(this.currentValue.state, this.savedValue.state);
    }

    get favoriteViews(): View[] {
        return this.views.filter(it => it.isFavorite);
    }

    get globalViews(): View[] {
        return this.views.filter(it => it.isGlobal);
    }

    get privateViews(): View[] {
        return this.views.filter(it => !it.isGlobal);
    }

    get globalViewTree(): ViewTree[] {
        return buildViewTree(this.globalViews, this);
    }

    get privateViewTree(): ViewTree[] {
        return buildViewTree(this.privateViews, this);
    }

    /** True if any async tasks are pending. */
    get isLoading(): boolean {
        const {loadModel, saveTask, viewSelectionTask} = this;
        return loadModel.isPending || saveTask.isPending || viewSelectionTask.isPending;
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
        this.persistWith = {persistTransientState: true, ...persistWith};
        this.manageGlobal = executeIfFunction(manageGlobal) ?? false;
        this.enableDefault = enableDefault;
        this.enableFavorites = enableFavorites && !!persistWith;
        this.saveDialogModel = new SaveDialogModel(this);

        this.viewSelectionTask = TaskObserver.trackLast({
            message: `Updating ${this.typeDisplayName}...`
        });
        this.saveTask = TaskObserver.trackLast({
            message: `Saving ${this.typeDisplayName}...`
        });

        if (this.enableFavorites) {
            this.addReaction(this.favoritesReaction(), this.viewsReaction());
        }
    }

    private async initAsync() {
        const views = await this.fetchViewsAsync();
        throwIf(!this.enableDefault && isEmpty(views), 'No views found for View Manager.');

        runInAction(() => (this.views = views));

        // Setup persistence
        if (this.persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'viewManager',
                    ...this.persistWith
                },
                target: this
            });
            await when(() => !this.viewSelectionTask.isPending);
        }

        if (!this.currentValue.view && !this.enableDefault) {
            await this.setValueAsync({view: first(views)});
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const views = await this.fetchViewsAsync();
            if (loadSpec.isStale) return;
            runInAction(() => (this.views = views));
        } catch (e) {
            if (loadSpec.isStale) return;
            XH.handleException(e, {showAlert: false});
        }
    }

    async selectViewAsync(token: string): Promise<void> {
        // TODO - prompt if dirty
        return this.setValueAsync({view: token && this.views.find(it => it.token === token)});
    }

    //------------------------
    // Saving/resetting
    //------------------------
    async saveAsync(): Promise<void> {
        const {canSave, savedValue, currentValue, typeDisplayName} = this;
        throwIf(!canSave, 'Unable to save view.');

        if (savedValue.view.isGlobal) {
            if (!(await this.confirmSaveForGlobalViewAsync())) return;
        }

        // todo - check if basis is older than savedValue. Could also be different entirely!
        try {
            const blob = await XH.jsonBlobService
                .updateAsync(savedValue.view.token, {
                    value: currentValue.state
                })
                .linkTo(this.saveTask);
            runInAction(() => {
                this.savedValue = this.currentValue = this.blobToViewWithState(blob);
            });
            XH.successToast(`${startCase(typeDisplayName)} successfully saved.`);
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
    }

    async saveAsAsync(): Promise<void> {
        const {currentValue, views, typeDisplayName} = this;

        const blob = await this.saveDialogModel.openAsync(
            currentValue,
            views.map(it => it.name)
        );

        if (blob) {
            XH.successToast(`${startCase(typeDisplayName)} successfully saved.`);
            await this.setValueAsync(this.blobToViewWithState(blob));
            await this.refreshAsync();
        }
    }

    async resetAsync(): Promise<void> {
        const {view} = this.savedValue;
        await this.setValueAsync({view});
    }

    @action
    // TODO - state is not a great name -- maybe "setTransientState"?
    setCurrentState(state: Partial<T>) {
        state = this.cleanState(state);
        if (!isEqual(state, this.currentValue.state)) {
            this.currentValue = {...this.currentValue, state};
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
    getPersistableState(): PersistableState<ViewManagerModelPersistState<T>> {
        const {currentValue, isStateDirty, persistWith, savedValue} = this,
            state: ViewManagerModelPersistState<T> = {
                value:
                    persistWith.persistTransientState && isStateDirty
                        ? currentValue
                        : omit(savedValue, 'state')
            };

        if (this.enableFavorites) state.favorites = this.favorites;

        return new PersistableState(state);
    }

    setPersistableState(state: PersistableState<ViewManagerModelPersistState<T>>) {
        const {value, favorites} = state.value;
        this.setValueAsync(this.persistWith.persistTransientState ? value : omit(value, 'state'));

        if (favorites && this.enableFavorites) this.favorites = favorites;
    }

    //------------------
    // Implementation
    //------------------
    private favoritesReaction(): ReactionSpec<string[]> {
        return {
            track: () => this.favorites,
            run: () => {
                this.views = this.views.map(view => ({
                    ...view,
                    isFavorite: this.isFavorite(view.token)
                }));
            }
        };
    }

    private viewsReaction(): ReactionSpec<View[]> {
        return {
            track: () => this.views,
            run: views => {
                if (this.savedValue.view) {
                    const updatedView = views.find(it => it.token === this.savedValue.view.token);
                    if (updatedView) {
                        this.savedValue = {...this.savedValue, view: updatedView};
                    } else if (this.enableDefault) {
                        this.savedValue = {view: null, state: {}}; // View no longer exists
                    } else {
                        this.setValueAsync({view: first(views), state: this.currentValue.state});
                    }
                }
            }
        };
    }

    private async fetchViewsAsync(): Promise<View[]> {
        const blobs = await XH.jsonBlobService.listAsync({
            type: this.viewType,
            includeValue: false
        });
        return blobs.map(it => this.blobToView(it));
    }

    /**
     * Set the current value. If state is not provided, the view's saved state will be used.
     */
    private setValueAsync(viewWithState: Partial<ViewWithState<T>>): Promise<void> {
        const {view, state} = viewWithState;
        return this.getSavedValueAsync(view?.token)
            .thenAction(savedValue => {
                this.savedValue = savedValue;
                // todo - handle case where view no longer exists
                this.currentValue = state ? {view, state} : savedValue;
                this.providers.forEach(it => it.pushStateToTarget());
            })
            .linkTo(this.viewSelectionTask);
    }

    private async getSavedValueAsync(token: string): Promise<ViewWithState<T>> {
        if (!token) return {view: null, state: {}};
        const blob = await XH.jsonBlobService.getAsync(token);
        return this.blobToViewWithState(blob);
    }

    private blobToViewWithState({value, ...blob}: JsonBlob): ViewWithState<T> {
        return {
            view: this.blobToView(blob),
            state: value
        };
    }

    private blobToView(blob: JsonBlob): View {
        const isGlobal = blob.acl === '*';
        return {
            ...blob,
            shortName: blob.name?.substring(blob.name.lastIndexOf('\\') + 1),
            isGlobal,
            isFavorite: this.isFavorite(blob.token)
        };
    }

    /**
     * Stringify and parse to ensure that any value set here is valid, serializable JSON.
     */
    private cleanState(state: Partial<T>): Partial<T> {
        if (isNil(state)) state = {};
        return JSON.parse(JSON.stringify(state));
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
}

interface ViewManagerModelPersistState<T> {
    // Will only persist state if the view is dirty
    value: Partial<ViewWithState<T>>;
    favorites?: string[];
}
