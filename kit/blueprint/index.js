/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {Dialog, FocusStyleManager, HotkeysProvider, Overlay, Popover} from '@blueprintjs/core';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/datetime/lib/css/blueprint-datetime.css';
import './styles.scss';

// Only show focus indicators when tabbing through components - avoids drawing focus outlines
// on focusable components when focused via mouse click.
FocusStyleManager.onlyShowFocusOnTabs();

// Disable fade/scale-in transitions.
// See also popover-related override in ./styles.scss.
Dialog.defaultProps.transitionDuration = 0;
Dialog.defaultProps.transitionName = 'none';
Overlay.defaultProps.transitionDuration = 0;
Overlay.defaultProps.transitionName = 'none';
Popover.defaultProps.transitionDuration = 0;

export {
    useHotkeys,
    ContextMenu,
    Classes,
    PopoverInteractionKind,
    Position,
    Toaster
} from '@blueprintjs/core';

export * from './Wrappers';
export * from './Dialog';


export const hotkeysProvider = elemFactory(HotkeysProvider);
