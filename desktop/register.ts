import {platformManager} from '@xh/hoist/core/impl/PlatformManager';

// Base styles for desktop components, loaded here as every desktop component imports this module
// ahead of its own stylesheet - so component styles always come later and win at equal specificity.
import './styles/Base.scss';
import './styles/BlueprintBase.css';
import './styles/Popover.scss';
import './styles/Inputs.scss';
import './styles/BlueprintOverrides.scss';

platformManager.registerDesktop();
