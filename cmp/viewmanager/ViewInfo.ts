import {SECONDS} from '@xh/hoist/utils/datetime';
import {ViewManagerModel} from './ViewManagerModel';
import {JsonBlob} from '@xh/hoist/svc';
import {PlainObject, XH} from '@xh/hoist/core';

/**
 * Metadata describing {@link View} managed by {@link ViewManagerModel}.
 */
export class ViewInfo {
    /** Unique Id */
    readonly token: string;

    /** App-defined type discriminator. */
    readonly type: string;

    /** User-supplied descriptive name. */
    readonly name: string;

    /** Description of the view. **/
    readonly description: string;

    /**
     * User that can write this view.  Typically, the original creator.
     * Null if the view is global.
     */
    readonly owner: string;

    /** Is the owner making this view accessible to others? Always true for global views. */
    readonly isShared: boolean;

    /** True if this view is global and visible to all users. */
    readonly isGlobal: boolean;

    /** Optional group name used for bucketing this view in display. */
    readonly group: string;

    /**
     * Should this view be pinned by users by default?
     * This value is intended to be used for global views only.
     */
    readonly isDefaultPinned: boolean;

    /**
     * Original meta-data on views associated JsonBlob.
     * Not typically used by applications;
     */
    readonly meta: PlainObject;

    dateCreated: number;
    lastUpdated: number;
    lastUpdatedBy: string;

    readonly model: ViewManagerModel;

    constructor(blob: JsonBlob, model: ViewManagerModel) {
        this.token = blob.token;
        this.type = blob.type;
        this.name = blob.name;
        this.description = blob.description;
        this.owner = blob.owner;
        this.meta = (blob.meta as PlainObject) ?? {};
        this.isGlobal = !this.owner;

        this.group = this.meta.group ?? null;
        this.isDefaultPinned = !!(this.isGlobal && this.meta.isDefaultPinned);
        this.isShared = !!(!this.isGlobal && this.meta.isShared);

        // Round to seconds.  See: https://github.com/xh/hoist-core/issues/423
        this.dateCreated = Math.round(blob.dateCreated / SECONDS) * SECONDS;
        this.lastUpdated = Math.round(blob.lastUpdated / SECONDS) * SECONDS;
        this.lastUpdatedBy = blob.lastUpdatedBy;
        this.model = model;
    }

    get isOwned(): boolean {
        return this.owner === XH.getUsername();
    }

    get isEditable(): boolean {
        return this.isOwned || (this.isGlobal && this.model.manageGlobal);
    }

    get isCurrentView(): boolean {
        return this.token === this.model.view.token;
    }

    /**
     * True if this view should appear on the users easy access menu.
     *
     * This value is computed with the user persisted state along with the View's
     * `defaultPinned` property.
     */
    get isPinned(): boolean {
        return this.isUserPinned ?? this.isDefaultPinned;
    }

    /**
     * The user indicated pin state for this view, or null if user has not indicated a preference.
     */
    get isUserPinned(): boolean | null {
        return this.model.isUserPinned(this);
    }

    get typedName(): string {
        return `${this.model.typeDisplayName} "${this.name}"`;
    }
}
