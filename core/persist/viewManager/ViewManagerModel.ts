import {
    HoistModel,
    LoadSpec,
    managed,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    Thunkable,
    XH
} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, pluralize} from '@xh/hoist/utils/js';
import {capitalize, find, isEqualWith, isNil, isString, sortBy, startCase} from 'lodash';
import {runInAction} from 'mobx';
import {ManageDialogModel} from './impl/ManageDialogModel';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {View, ViewTree} from './Types';

/**
 * ViewManager provides re-usable loading, selection, and user management of named configs, which are modelled
 * and persisted on the server as databased domain objects extending the `PersistedObject` trait.
 *
 * These generic configs are intended for specific use cases such as saved Grid views, Dashboards, and data import
 * mapping configs. This model loads all available views from a configured endpoint and exposes a `provider` property
 * that can be passed to any HoistModel that takes a `persistWith` config.
 *
 * Objects managed by this system can be private or shared based on a user's company and/or app roles. The `acl` field
 * on each persisted object determines if and how it is shared. Users with the configured `adminRole` can share saved
 * objects to all app users and save changes to shared objects directly. Users with the configured `editorRole` can
 * share objects to their own company only and modify shared objects shared only within their company. All users can
 * save/update/delete their own private objects.
 */
interface Entity {
    /** Key used in JsonBlob */
    name: string;
    /** User-facing name/label for an object managed by this model. */
    displayName?: string;
}

export interface ViewManagerConfig {
    /** Entity name or object for this model. */
    entity: string | Entity;
    /** Whether user can publish or edit globally shared objects. */
    canManageGlobal: Thunkable<boolean>;
    /** Used to persist this model's selected ID. */
    persistWith: PersistOptions;
    /** Optional flag to allow empty view selection. Defaults false*/
    enableDefault?: boolean;
    /** Optional flag to allow auto save state. Defaults false*/
    enableAutoSave?: boolean;
}

export class ViewManagerModel<T extends PlainObject = PlainObject> extends HoistModel {
    static async createAsync(config: ViewManagerConfig): Promise<ViewManagerModel> {
        const ret = new ViewManagerModel(config);
        await ret.loadAsync();
        return ret;
    }

    private readonly _canManageGlobal: Thunkable<boolean>;

    // Internal persistence provider, used to save *this* model's state, i.e. selectedId
    private readonly _provider;

    readonly enableDefault: boolean;
    readonly enableAutoSave: boolean;

    readonly entity: Entity;

    @managed readonly manageDialogModel: ManageDialogModel;

    @managed readonly saveDialogModel: SaveDialogModel;

    /** Current state of the active object, can include not-yet-persisted changes. */
    @observable.ref pendingValue: T = null;

    @observable.ref views: View<T>[] = [];

    @bindable selectedToken: string = null;
    @bindable favorites: string[] = [];

    get canManageGlobal(): boolean {
        return executeIfFunction(this._canManageGlobal);
    }

    get value(): T {
        return this.selectedView?.value;
    }

    get selectedView(): View<T> {
        return this.views.find(it => it.token === this.selectedToken);
    }

    get isSharedViewSelected(): boolean {
        return !isNil(
            find(this.sharedViews, it => {
                return it.token === this.selectedToken;
            })
        );
    }

    @computed
    get canSave(): boolean {
        const {selectedView} = this;
        return (
            selectedView &&
            this.isDirty &&
            (this.canManageGlobal || !selectedView.isShared) &&
            !this.loadModel.isPending
        );
    }

    @computed
    get isDirty(): boolean {
        return !this.isEqualSkipAutosize(this.pendingValue, this.value);
    }

    get isShared(): boolean {
        return !!this.selectedView?.isShared;
    }

    get favoritedViews(): View<T>[] {
        return this.views.filter(it => this.favorites.includes(it.token));
    }

    get sharedViews(): View<T>[] {
        return this.views.filter(it => it.isShared);
    }

    get privateViews(): View<T>[] {
        return this.views.filter(it => !it.isShared);
    }

    get sharedViewTree(): ViewTree[] {
        return this.hierarchicalItemSpecs(sortBy(this.sharedViews, 'name'));
    }

    get privateViewTree(): ViewTree[] {
        return this.hierarchicalItemSpecs(sortBy(this.privateViews, 'name'));
    }

    get persistState() {
        return {selectedToken: this.selectedToken, favorites: this.favorites};
    }

    private constructor({
        entity,
        persistWith,
        canManageGlobal,
        enableDefault = false,
        enableAutoSave = false
    }: ViewManagerConfig) {
        super();
        makeObservable(this);

        this.entity = this.parseEntity(entity);
        this._canManageGlobal = canManageGlobal;
        this.enableDefault = enableDefault;
        this.enableAutoSave = enableAutoSave;
        this.saveDialogModel = new SaveDialogModel(this, this.entity.name);
        this.manageDialogModel = new ManageDialogModel(this);

        // Set up internal PersistenceProvider -- fail gently
        if (persistWith) {
            try {
                this._provider = PersistenceProvider.create({
                    path: 'viewManager',
                    ...persistWith
                });

                const state = this._provider.read();
                if (state?.selectedToken) this.selectedToken = state.selectedToken;
                if (state?.favorites) this.favorites = state.favorites;
                this.addReaction(
                    {
                        track: () => this.persistState,
                        run: state => this._provider.write(state)
                    },
                    {
                        track: () => this.pendingValue,
                        run: () => {
                            if (this.enableAutoSave && !this.isSharedViewSelected) {
                                this.saveAsync(true);
                            }
                        }
                    }
                );
            } catch (e) {
                this.logError('Error applying persistWith', persistWith, e);
                XH.safeDestroy(this._provider);
                this._provider = null;
            }
        }
    }

    // TODO - Carefully review if this method needs isStale checks, and how to properly implement them.
    override async doLoadAsync(loadSpec: LoadSpec) {
        const {name} = this.entity,
            rawViews = await XH.jsonBlobService.listAsync(
                {type: name, includeValue: true},
                loadSpec
            );

        runInAction(() => (this.views = this.processRaw(rawViews)));

        // Always call selectAsync to ensure pendingValue updated and onChangeAsync callback fired if needed
        const token =
            this.selectedView?.token ?? (!this.enableDefault ? this.views[0]?.token : null);
        await this.selectAsync(token);
    }

    async selectAsync(token: string) {
        this.selectedToken = token;
        const {value} = this;
        this.setPendingValue(value);
    }

    async saveAsync(skipToast: boolean = false) {
        const {selectedView, entity, pendingValue, isShared} = this,
            {token} = selectedView;
        if (isShared) {
            if (!(await this.confirmShareObjSaveAsync())) return;
        }
        try {
            await XH.jsonBlobService.updateAsync(token, {
                ...selectedView,
                value: pendingValue
            });
        } catch (e) {
            return XH.handleException(e, {alertType: 'toast'});
        }
        await this.refreshAsync();
        await this.selectAsync(token);

        if (!skipToast) XH.successToast(`${capitalize(entity.displayName)} successfully saved.`);
    }

    async saveAsAsync() {
        const {name, description} = this.selectedView ?? {};
        this.saveDialogModel.open({
            name,
            description,
            value: this.pendingValue
        });
    }

    async resetAsync() {
        return this.selectAsync(this.selectedToken);
    }

    toggleFavorite(token: string) {
        if (!token) return;

        if (this.favorites.includes(token)) {
            this.removeFavorite(token);
        } else {
            this.addFavorite(token);
        }
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

    @action
    openManageDialog() {
        this.manageDialogModel.openAsync();
    }

    @action
    closeManageDialog() {
        this.manageDialogModel.close();
    }

    getHierarchyDisplayName(name) {
        return name?.substring(name.lastIndexOf('\\') + 1);
    }

    mergePendingValue(value: T) {
        value = {...this.pendingValue, ...this.cleanValue(value)};
        this.setPendingValue(value);
    }

    //------------------
    // Implementation
    //------------------

    private parseEntity(entity: string | Entity): Entity {
        const ret = isString(entity) ? {name: entity} : {...entity};
        ret.displayName = ret.displayName ?? startCase(ret.name);
        return ret;
    }

    private processRaw(raw: PlainObject): View<T>[] {
        const {entity} = this,
            name = capitalize(pluralize(entity.displayName));
        return raw.map(it => {
            it.isShared = it.acl === '*';
            const group = it.isShared ? `Shared ${name}` : `My ${name}`;
            return {...it, group};
        });
    }

    @action
    private setPendingValue(value: T) {
        if (isNil(value)) {
            this.pendingValue = null;
            return;
        }
        value = this.cleanValue(value);
        if (!this.isEqualSkipAutosize(this.pendingValue, value)) {
            this.pendingValue = value;
        }
    }

    private cleanValue(value: T): T {
        // Stringify and parse to ensure that the value is valid JSON
        // (i.e. no object instances, no keys with undefined values, etc.)
        return JSON.parse(JSON.stringify(value));
    }

    private isEqualSkipAutosize(a, b) {
        // Skip spurious column autosize differences between states
        const comparer = (aVal, bVal, key, aObj) => {
            if (key === 'width' && !isNil(aObj.colId) && !aObj.manuallySized) return true;
            return undefined;
        };
        return isEqualWith(a, b, comparer);
    }

    private async confirmShareObjSaveAsync() {
        return XH.confirm({
            message: `You are saving a shared public ${this.entity.displayName}. Do you wish to continue?`,
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

    private hierarchicalItemSpecs(views, depth: number = 0): ViewTree[] {
        const groups = {},
            unbalancedStableGroupsAndViews = [];

        views.forEach(record => {
            // Leaf Node
            if (this.getNameHierarchySubstring(record.name, depth + 1) == null) {
                unbalancedStableGroupsAndViews.push(record);
                return;
            }
            // Belongs to an already defined group
            const group = this.getNameHierarchySubstring(record.name, depth);
            if (groups[group]) {
                groups[group].children.push(record);
                return;
            }
            // Belongs to a not defined group, create it
            groups[group] = {name: group, children: [record], isMenuFolder: true};
            unbalancedStableGroupsAndViews.push(groups[group]);
        });

        return unbalancedStableGroupsAndViews.map(it => {
            const {name, isMenuFolder, children, token} = it;
            if (isMenuFolder) {
                return {
                    type: 'directory',
                    text: name,
                    items: this.hierarchicalItemSpecs(children, depth + 1),
                    selected: this.isFolderForEntry(name, this.selectedView?.name, depth)
                };
            }
            return {
                type: 'view',
                text: this.getHierarchyDisplayName(name),
                selected: this.selectedToken === token,
                token
            };
        });
    }

    private getNameHierarchySubstring(name, depth) {
        const arr = name?.split('\\') ?? [];
        if (arr.length <= depth) {
            return null;
        }
        return arr.slice(0, depth + 1).join('\\');
    }

    private isFolderForEntry(folderName, entryName, depth) {
        const name = this.getNameHierarchySubstring(entryName, depth);
        return name && name === folderName && folderName.length < entryName.length;
    }
}
