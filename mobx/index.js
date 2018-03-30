/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {configure} from 'mobx';

export {observable, action, autorun, computed, when, toJS, trace} from 'mobx';
export {observer} from 'mobx-react';
export {setter} from 'mobx-decorators/lib';

configure({enforceActions: true});
