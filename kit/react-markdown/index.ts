/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ElementFactory, elementFactory} from '@xh/hoist/core';
import ReactMarkdown, {type Options} from 'react-markdown';

export {ReactMarkdown};
export const reactMarkdown: ElementFactory<Readonly<Options>> = elementFactory(ReactMarkdown);
