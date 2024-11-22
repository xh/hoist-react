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
import {View} from '@xh/hoist/core/persist/viewmanager/View';
import {genDisplayName} from '@xh/hoist/data';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {JsonBlob} from '@xh/hoist/svc';
import {executeIfFunction, pluralize, throwIf} from '@xh/hoist/utils/js';
import {first, isEmpty, isEqual, isNil, lowerCase, pick, startCase} from 'lodash';
import {runInAction, when} from 'mobx';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {buildViewTree} from './impl/BuildViewTree';
import {ViewInfo, ViewTree} from './Types';

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
    /** Save the pending (unsaved) value in state. Default is true. */
    persistPendingView?: boolean;
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
export class ViewManagerModel<T = PlainObject>
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

    /** Current view or the "default" view. Will not include uncommitted changes */
    @observable.ref view: View<T> = View.DEFAULT;
    /** Pending (transient) view, can include not-yet-saved changes. */
    @observable.ref pendingView: View<T> = this.view;
    /** Loaded saved view library - both private and global */
    @observable.ref views: ViewInfo[] = [];
    /** List of tokens for the user's favorite views. */
    @observable.ref favorites: string[] = [];

    /**
     * TaskObserver linked to {@link selectViewAsync}. If a change to the active view is likely to
     * require intensive layout/grid work, consider masking affected components with this observer.
     */
    selectTask: TaskObserver;

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
        const {isLoading, view, manageGlobal} = this;
        return !isLoading && !view.isDefault && (manageGlobal || !view.isGlobal);
    }

    @computed
    get isValueDirty(): boolean {
        return !this.view.isValueEqual(this.pendingView);
    }

    get favoriteViews(): ViewInfo[] {
        return this.views.filter(it => it.isFavorite);
    }

    get globalViews(): ViewInfo[] {
        return this.views.filter(it => it.isGlobal);
    }

    get privateViews(): ViewInfo[] {
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
        const {loadModel, saveTask, selectTask} = this;
        return loadModel.isPending || saveTask.isPending || selectTask.isPending;
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
        this.persistWith = {persistPendingView: true, ...persistWith};
        this.manageGlobal = executeIfFunction(manageGlobal) ?? false;
        this.enableDefault = enableDefault;
        this.enableFavorites = enableFavorites && !!persistWith;
        this.saveDialogModel = new SaveDialogModel(this);

        this.selectTask = TaskObserver.trackLast({
            message: `Updating ${this.typeDisplayName}...`
        });
        this.saveTask = TaskObserver.trackLast({
            message: `Saving ${this.typeDisplayName}...`
        });

        this.addReaction(this.favoritesReaction(), this.viewsReaction());
    }

    private async initAsync() {
        const views = await this.fetchViewInfosAsync();
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
            await when(() => !this.selectTask.isPending);
        }

        if (this.view.isDefault && !this.enableDefault) {
            await this.setViewAsync(first(views));
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            const views = await this.fetchViewInfosAsync();
            if (loadSpec.isStale) return;
            runInAction(() => (this.views = views));
        } catch (e) {
            if (loadSpec.isStale) return;
            XH.handleException(e, {showAlert: false});
        }
    }

    async selectViewAsync(token: string): Promise<void> {
        if (!this.isValueDirty || (await this.confirmDiscardChangesAsync())) {
            await this.setViewAsync(token && this.views.find(it => it.token === token)).catch(e =>
                XH.handleException(e, {alertType: 'toast'})
            );
        }
    }

    //------------------------
    // Saving/resetting
    //------------------------
    async saveAsync(): Promise<void> {
        const {canSave, view, pendingView, typeDisplayName} = this;
        throwIf(!canSave, 'Unable to save view.');

        const current = await this.getSavedViewAsync(view.token);
        if (!current) return this.saveAsAsync();

        if (current.isSameVersion(view) && !(await this.confirmStaleSaveAsync())) return;
        if (current.isGlobal && !(await this.confirmSaveForGlobalViewAsync())) return;

        try {
            const update = await XH.jsonBlobService
                .updateAsync(view.token, {value: pendingView.value})
                .linkTo(this.saveTask);
            runInAction(() => {
                this.view = this.pendingView = this.blobToView(update);
            });
            XH.successToast(`${startCase(typeDisplayName)} successfully saved.`);
        } catch (e) {
            XH.handleException(e, {alertType: 'toast'});
        }
        this.refreshAsync();
    }

    async saveAsAsync(): Promise<void> {
        const {pendingView, typeDisplayName} = this,
            view = (await this.saveDialogModel.openAsync(pendingView)) as View<T>;

        if (view) {
            runInAction(() => (this.view = this.pendingView = view));
            XH.successToast(`${startCase(typeDisplayName)} successfully saved.`);
        }
        this.refreshAsync();
    }

    async resetAsync(): Promise<void> {
        await this.setViewAsync(this.view.info).catch(e =>
            XH.handleException(e, {alertType: 'toast'})
        );
    }

    getPendingValue(): Partial<T> {
        return this.pendingView.value;
    }

    @action
    setPendingValue(value: Partial<T>) {
        value = this.cleanState(value);
        if (!isEqual(value, this.pendingView.value)) {
            this.pendingView = new View(this.pendingView.info, value);
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

    @action
    addFavorite(token: string) {
        this.favorites = [...this.favorites, token];
    }

    @action
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
        const {pendingView, isValueDirty, persistWith, view} = this,
            state: ViewManagerModelPersistState<T> = {
                view:
                    persistWith.persistPendingView && isValueDirty
                        ? pick(pendingView, ['info', 'value']) // Persist value + basis
                        : pick(view, 'info') // Only persist selected view info
            };

        if (this.enableFavorites) state.favorites = this.favorites;

        return new PersistableState(state);
    }

    @action
    setPersistableState(state: PersistableState<ViewManagerModelPersistState<T>>) {
        const {view, favorites} = state.value;
        this.setViewAsync(view?.info, this.persistWith.persistPendingView ? view?.value : null);
        if (favorites && this.enableFavorites) this.favorites = favorites;
    }

    //------------------
    // Implementation
    //------------------
    private favoritesReaction(): ReactionSpec<string[]> {
        if (!this.enableFavorites) return null;
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

    private viewsReaction(): ReactionSpec<ViewInfo[]> {
        return {
            track: () => this.views,
            run: views => {
                if (!this.view.isDefault) {
                    const updatedInfo = views.find(it => it.token === this.view.token);
                    if (updatedInfo) {
                        // todo - view and state could get out of sync
                        if (!isEqual(updatedInfo, this.view.info)) {
                            this.view = new View(updatedInfo, this.view.value);
                        }
                    } else if (this.enableDefault) {
                        this.view = View.DEFAULT; // View no longer exists
                    } else {
                        // todo - catch?
                        this.setViewAsync(first(views), this.pendingView.value);
                    }
                }
            }
        };
    }

    private async fetchViewInfosAsync(): Promise<ViewInfo[]> {
        const blobs = await XH.jsonBlobService.listAsync({
            type: this.viewType,
            includeValue: false
        });
        return blobs.map(it => this.blobToViewInfo(it));
    }

    /**
     * Set the current view. If a value is not provided, the view's saved value will be used.
     * If info not provided, the "default" view will be used.
     */
    private setViewAsync(info: ViewInfo = null, value: Partial<T> = null): Promise<void> {
        return this.getSavedValueAsync(info?.token)
            .thenAction(savedValue => {
                this.view = savedValue;
                this.pendingView = value ? new View(info, value) : savedValue;
                this.providers.forEach(it => it.pushStateToTarget());
            })
            .catch(e => {
                if (value)
                    runInAction(() => {
                        this.pendingView = new View(info, value);
                        this.providers.forEach(it => it.pushStateToTarget());
                    });
                throw e;
            })
            .linkTo(this.selectTask);
    }

    private async getSavedValueAsync(token: string = null): Promise<View<T>> {
        if (!token) return View.DEFAULT;
        const view = await this.getSavedViewAsync(token);
        if (!view) throw XH.exception('Unable to load view.');
        return view;
    }

    private async getSavedViewAsync(token: string): Promise<View<T>> {
        try {
            const blob = await XH.jsonBlobService.getAsync(token);
            return this.blobToView(blob);
        } catch (e) {
            return null;
        }
    }

    blobToView({value, ...blob}: JsonBlob): View<T> {
        return new View(this.blobToViewInfo(blob), value);
    }

    private blobToViewInfo(blob: JsonBlob): ViewInfo {
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

    private async confirmDiscardChangesAsync() {
        // TODO - offer save option here as well
        return XH.confirm({
            message: `You have unsaved changes. Discard them and continue to switch ${pluralize(this.typeDisplayName)}?`,
            confirmProps: {
                text: 'Discard changes',
                intent: 'danger'
            },
            cancelProps: {
                text: 'Cancel',
                autoFocus: true
            }
        });
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

    private async confirmStaleSaveAsync() {
        return XH.confirm({
            message: `This ${this.typeDisplayName} has been updated since you last loaded it. Do you wish to save anyway?`,
            confirmProps: {
                text: 'Yes, save changes',
                intent: 'success'
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
    view: Partial<View<T>>;
    favorites?: string[];
}
