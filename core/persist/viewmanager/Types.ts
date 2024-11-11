import {PlainObject} from '@xh/hoist/core';

/**
 * Interface for a bundle of persisted component state managed by {@link ViewManagerModel}.
 * Views are persisted to the server as {@link JsonBlob}s.
 */
export interface View<T extends PlainObject = PlainObject> {
    /** Either null for private views or special token "*" for globally shared views. */
    acl: '*' | null;
    dateCreated: number;
    description: string;
    /** Calculated display group - either "Shared [entityName]" or "My [entityName]". */
    group: string;
    /**
     * True if user has tagged this view as a favorite. Note that a user's list of favorite views is
     * persisted via `ViewManagerModel.persistWith` and *not* stored in the blob itself.
     */
    isFavorite: boolean;
    /** True if this view has been shared (acl == "*") and is visible to all users. */
    isShared: boolean;
    lastUpdated: number;
    lastUpdatedBy: string;
    /** User-supplied descriptive name. */
    name: string;
    /** Original creator of the view, and the only user with access to it if not shared. */
    owner: string;
    token: string;
    /**
     * Application defined type for this view, read/set from {@link ViewManagerModel.entity.name}.
     * Specific to a particular instance/use-case of ViewManager within an app - eg one viewManager
     * loads `portfolioGridView` views and another `tradeDashboard` views.
     */
    type: string;
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
