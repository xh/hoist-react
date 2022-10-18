import AppComponent from './AppComponent';
import {apiDeprecated} from '../utils/js';

//--------------------------------------------------------------------
// Provided for Background compatibility for pre-v53 naming convention
//--------------------------------------------------------------------
export const App = AppComponent;
apiDeprecated(
    'The of @xh/hoist/admin/App has been deprecated.  Use @xh/hoist/admin/AppComponent instead.',
    {v: 'v55'}
);