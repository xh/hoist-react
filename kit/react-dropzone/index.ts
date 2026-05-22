/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import Dropzone from 'react-dropzone';

export {Dropzone};
export type {Accept, FileRejection, FileWithPath} from 'react-dropzone';
export const dropzone = elementFactory(Dropzone);
