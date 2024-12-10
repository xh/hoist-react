import {SECONDS} from '@xh/hoist/utils/datetime';
import {ViewManagerModel} from './ViewManagerModel';
import {JsonBlob} from '@xh/hoist/svc';

/**
 * Metadata describing {@link View} managed by {@link ViewManagerModel}.
 */
export class ViewInfo {
    /** Unique Id */
    readonly token: string;

    /** App-defined type discriminator, as per {@link ViewManagerConfig.type}. */
    readonly type: string;

    /** User-supplied descriptive name. */
    readonly name: string;

    /** Description of the view. **/
    readonly description: string;

    /** True if this view is global and visible to all users. */
    readonly isGlobal: boolean;

    /** Original creator of the view, and the only user with access to it if not global. */
    readonly owner: string;

    dateCreated: number;
    lastUpdated: number;
    lastUpdatedBy: string;

    private readonly model: ViewManagerModel;

    constructor(blob: JsonBlob, model: ViewManagerModel) {
        this.token = blob.token;
        this.type = blob.type;
        this.owner = blob.owner;
        this.name = blob.name;
        this.description = blob.description;
        this.isGlobal = blob.acl === '*';
        // Round to seconds.  See: https://github.com/xh/hoist-core/issues/423
        this.dateCreated = Math.round(blob.dateCreated / SECONDS) * SECONDS;
        this.lastUpdated = Math.round(blob.lastUpdated / SECONDS) * SECONDS;
        this.lastUpdatedBy = blob.lastUpdatedBy;
        this.model = model;
    }

    /**
     * True if user has tagged this view as a favorite. Note that a user's list of favorite views
     * is persisted via `ViewManagerModel.persistWith` and *not* stored in the blob itself.
     */
    get isFavorite(): boolean {
        return this.model.isFavorite(this.token);
    }

    get typedName(): string {
        return `${this.model.typeDisplayName} '${this.name}'`;
    }
}
