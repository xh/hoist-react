import {AppComponent} from './AppComponent';
import {apiDeprecated} from '../utils/js';

//--------------------------------------------------------------------
// Provided for Background compatibility for pre-v53 naming convention
//--------------------------------------------------------------------
export const App = AppComponent;
apiDeprecated('@xh/hoist/admin/App', {v: 'v55', msg: 'Use @xh/hoist/admin/AppComponent instead'});
