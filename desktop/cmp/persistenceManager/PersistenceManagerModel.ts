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
import {StoreRecordId} from '@xh/hoist/data/StoreRecord';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, pluralize} from '@xh/hoist/utils/js';
import {
    capitalize,
    cloneDeep,
    groupBy,
    isEqualWith,
    isNil,
    isString,
    keys,
    sortBy,
    startCase
} from 'lodash';
import {ManageDialogModel} from './impl/ManageDialogModel';
import {SaveDialogModel} from './impl/SaveDialogModel';
import {runInAction} from 'mobx';
import {PersistenceView, TreeView} from '@xh/hoist/desktop/cmp/persistenceManager/Types';

/**
 * PersistenceManager provides re-usable loading, selection, and user management of named configs, which are modelled
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

export interface PersistenceManagerConfig<T extends PlainObject> {
    entity: string | Entity;
    /** True to omit the default menu component. Should be used when creating custom app-specific component */
    omitDefaultMenuComponent?: boolean;
    /** Whether user can publish or edit globally shared objects. */
    canManageGlobal: Thunkable<boolean>;
    /** Async callback triggered when view changes. Should be used to recreate the affected models. */
    onChangeAsync: (value: T) => void;
    /** Used to persist this model's selected ID. */
    persistWith: PersistOptions;
    /** True (default) to render a save button alongside the primary menu button when dirty. */
    enableTopLevelSaveButton?: boolean;
    /** Fn to produce a new, empty object - can be async. */
    newObjectFnAsync?: () => T;
}

export class PersistenceManagerModel<T extends PlainObject = PlainObject> extends HoistModel {
    //------------------------
    // Persistence Provider
    // Pass this to models that implement `persistWith` to include their state in the view.
    //------------------------
    readonly provider: PersistOptions = {
        getData: () => cloneDeep(this.pendingValue ?? this.value ?? {}),
        setData: (value: T) => this.mergePendingValue(value)
    };

    readonly enableTopLevelSaveButton: boolean = true;

    private readonly _canManageGlobal: Thunkable<boolean>;

    readonly onChangeAsync?: (value: T) => void;

    readonly entity: Entity;

    readonly omitDefaultMenuComponent: boolean = false;

    @observable.ref @managed manageDialogModel: ManageDialogModel;

    @observable.ref @managed saveDialogModel: SaveDialogModel;
    /** Current state of the active object, can include not-yet-persisted changes. */
    @observable.ref pendingValue: T = null;

    @observable.ref views: PersistenceView<T>[] = [];

    @bindable selectedId: StoreRecordId;

    get canManageGlobal(): boolean {
        return executeIfFunction(this._canManageGlobal);
    }

    get value(): T {
        return this.selectedView?.value;
    }

    get selectedView(): PersistenceView<T> {
        return this.views.find(it => it.id === this.selectedId);
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

    get favoritedViews(): PersistenceView<T>[] {
        return this.views.filter(it => it.isFavorite);
    }

    get viewTree(): TreeView[] {
        const groupedViews = groupBy(this.views, 'group'),
            sortedGroupKeys = keys(groupedViews).sort(),
            ret = [];

        if (this.favoritedViews.length > 0) {
            ret.push({itemType: 'divider', text: 'Favorites'});
            ret.push(...this.hierarchicalItemSpecs(this.favoritedViews));
        }

        sortedGroupKeys.forEach(group => {
            ret.push({itemType: 'divider', text: group});
            ret.push(...this.hierarchicalItemSpecs(sortBy(groupedViews[group], 'name')));
        });
        return ret;
    }

    // Internal persistence provider, used to save *this* model's state, i.e. selectedId
    private readonly _provider;

    constructor({
        entity,
        omitDefaultMenuComponent,
        onChangeAsync,
        persistWith,
        canManageGlobal,
        enableTopLevelSaveButton = true
    }: PersistenceManagerConfig<T>) {
        super();
        makeObservable(this);

        this.entity = this.parseEntity(entity);
        this._canManageGlobal = canManageGlobal;
        this.enableTopLevelSaveButton = enableTopLevelSaveButton;
        this.omitDefaultMenuComponent = omitDefaultMenuComponent;
        this.onChangeAsync = onChangeAsync;
        this.saveDialogModel = new SaveDialogModel(this, this.entity.name);
        this.manageDialogModel = new ManageDialogModel(this);
        // Set up internal PersistenceProvider -- fail gently
        if (persistWith) {
            try {
                this._provider = PersistenceProvider.create({
                    path: 'persistenceManager',
                    ...persistWith
                });

                const state = this._provider.read();
                if (state?.selectedId) this.selectedId = state.selectedId;
                this.addReaction({
                    track: () => this.selectedId,
                    run: selectedId => this._provider.write({selectedId})
                });
            } catch (e) {
                this.logError('Error applying persistWith', persistWith, e);
                XH.safeDestroy(this._provider);
                this._provider = null;
            }
        }

        this.loadAsync();
    }

    // TODO - Carefully review if this method needs isStale checks, and how to properly implement them.
    override async doLoadAsync(loadSpec: LoadSpec) {
        const {name} = this.entity,
            rawViews = await XH.jsonBlobService.listAsync({type: name, includeValue: true});

        runInAction(() => (this.views = this.processRaw(rawViews)));

        // Always call selectAsync to ensure pendingValue updated and onChangeAsync callback fired if needed
        const id = this.selectedView?.id ?? this.views[0].id;
        await this.selectAsync(id);
    }

    async selectAsync(id: StoreRecordId) {
        this.selectedId = id;
        if (!this.isDirty) return;

        const {value} = this;

        this.setPendingValue(value);
        await this.onChangeAsync(value);
    }

    async saveAsync(skipToast: boolean = false) {
        const {selectedView, entity, pendingValue, isShared} = this,
            {token, id} = selectedView;
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
        await this.selectAsync(id);

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
        return this.selectAsync(this.selectedId);
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

    //------------------
    // Implementation
    //------------------

    private parseEntity(entity: string | Entity): Entity {
        const ret = isString(entity) ? {name: entity} : {...entity};
        ret.displayName = ret.displayName ?? startCase(ret.name);
        return ret;
    }

    private mergePendingValue(value: T) {
        value = {...this.pendingValue, ...this.cleanValue(value)};
        this.setPendingValue(value);
    }

    private processRaw(raw: PlainObject): PersistenceView<T>[] {
        const {entity} = this,
            name = capitalize(pluralize(entity.displayName));
        return raw.map(it => {
            it.isShared = it.acl === '*';
            it.isFavorite = it.meta?.isFavorite;
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

    private hierarchicalItemSpecs(views, depth: number = 0): TreeView[] {
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
            const {name, id, isMenuFolder, children} = it;
            if (isMenuFolder) {
                return {
                    itemType: 'menuFolder',
                    text: name,
                    items: this.hierarchicalItemSpecs(children, depth + 1),
                    selected: this.isFolderForEntry(name, this.selectedView?.name, depth)
                };
            }
            return {
                itemType: 'view',
                text: this.getHierarchyDisplayName(name),
                selected: this.selectedId === id,
                key: id
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
