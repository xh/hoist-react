/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import 'semantic-ui-css/semantic.min.css';

import {elemFactory} from 'hoist/hyperscript';
import {Loader, Dimmer} from 'semantic-ui-react';

export const loader = elemFactory(Loader),
    dimmer = elemFactory(Dimmer);
