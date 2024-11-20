import {PlainObject} from '@xh/hoist/core';

/**
 * Interface for a bundle of {@link PersistableState} managed by {@link ViewManagerModel}.
 * Views are persisted to / loaded from the server as {@link JsonBlob}s.
 */
export interface View<T extends PlainObject = PlainObject> {
    /** Either null for private views or special token "*" for global views. */
    acl: '*' | null;
    description: string;

    dateCreated: number;
    lastUpdated: number;
    lastUpdatedBy: string;

    /** Unique Id */
    token: string;

    /** App-defined type discriminator, as per {@link ViewManagerConfig.viewType}. */
    type: string;

    /**
     * True if user has tagged this view as a favorite. Note that a user's list of favorite views is
     * persisted via `ViewManagerModel.persistWith` and *not* stored in the blob itself.
     */
    isFavorite: boolean;

    /** True if this view is global (acl == "*") and is visible to all users. */
    isGlobal: boolean;

    /** User-supplied descriptive name, including folder designating prefix. */
    name: string;

    /** User-supplied descriptive name, without folder designating prefix. */
    shortName: string;

    /** Original creator of the view, and the only user with access to it if not shared. */
    owner: string;

    /** Persisted value of the view.  Maybe null for "stub" listing of the view. */
    value: T;
}

/**
 * Abstract representation of ViewManager views available for selection, potentially grouped into
 * hierarchical folders. Lightweight, user-driven organization into "folders" is supported by
 * inserting a "\" in the name of any view.
 */
export type ViewTree = {
    text: string;
    selected: boolean;
} & (
    | {
          type: 'folder';
          items: ViewTree[];
      }
    | {
          type: 'view';
          token: string;
          description: string;
      }
);
