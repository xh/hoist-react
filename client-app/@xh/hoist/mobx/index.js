/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {useStrict} from 'mobx';

export {observable, action, autorun, computed, when, toJS, trace, whyRun} from 'mobx';
export {observer} from 'mobx-react';
export {setter} from 'mobx-decorators';

useStrict(true);
