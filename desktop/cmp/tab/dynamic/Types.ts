import {ReactElement, ReactNode} from 'react';

export interface ActionTabSpec {
    /** Unique ID for the tab. */
    id: string;
    /** Display title for the Tab. */
    title?: ReactNode;
    /** Display icon for the Tab. */
    icon?: ReactElement;
    /** Tooltip for the Tab. */
    tooltip?: ReactNode;
    /** True to disable this tab. */
    disabled?: boolean;
    /** True to omit this tab. */
    omit?: boolean;
    /** Action to be performed when the tab is selected. */
    actionFn: () => void;
    /** Function called prior to showing this item. */
    displayFn?: () => Omit<ActionTabSpec, 'id' | 'actionFn'>;
}
