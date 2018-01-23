/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {elemFactory} from 'hoist';
import {ErrorDetailsDialog} from './ErrorDetailsDialog';
import {ErrorRichAlertDialog} from './ErrorRichAlertDialog';
import {LoadMask} from './LoadMask';

export const errorDetailsDialog = elemFactory(ErrorDetailsDialog);
export const errorRichAlertDialog = elemFactory(ErrorRichAlertDialog);
export const loadMask = elemFactory(LoadMask);
