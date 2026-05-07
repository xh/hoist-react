/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

// ESM barrel for the forked golden-layout 1.5.9 source. Order matches the
// gulp concat order from the original golden-layout build, with utils first
// (provides lm.utils.copy/extend used at module load by other files), and
// items/AbstractContentItem.js before its subclasses.
import './utils/utils.js';
import './utils/EventEmitter.js';
import './utils/DragListener.js';
import './LayoutManager.js';
import './config/ItemDefaultConfig.js';
import './config/defaultConfig.js';
import './container/ItemContainer.js';
import './controls/BrowserPopout.js';
import './controls/DragProxy.js';
import './controls/DragSource.js';
import './controls/DropTargetIndicator.js';
import './controls/Header.js';
import './controls/HeaderButton.js';
import './controls/Splitter.js';
import './controls/Tab.js';
import './controls/TransitionIndicator.js';
import './errors/ConfigurationError.js';
import './items/AbstractContentItem.js';
import './items/Component.js';
import './items/Root.js';
import './items/RowOrColumn.js';
import './items/Stack.js';
import './utils/BubblingEvent.js';
import './utils/ConfigMinifier.js';
import './utils/EventHub.js';
import './utils/ReactComponentHandler.js';

import {lm} from './ns.js';

export default lm.LayoutManager;
