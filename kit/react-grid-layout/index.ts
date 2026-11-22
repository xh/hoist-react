/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import ReactGridLayout, {type GridLayoutProps} from 'react-grid-layout';
import {GridBackground, type GridBackgroundProps} from 'react-grid-layout/extras';
import 'react-grid-layout/css/styles.css';

export {ReactGridLayout, GridBackground};
export {bottom, cloneLayout, getCompactor, noCompactor} from 'react-grid-layout';
export {correctBounds} from 'react-grid-layout/core';
export {wrapCompactor} from 'react-grid-layout/extras';
export type {Compactor, Layout, LayoutItem} from 'react-grid-layout';
export type {GridLayoutProps, GridBackgroundProps};

export const reactGridLayout = elementFactory<GridLayoutProps>(ReactGridLayout);
export const gridBackground = elementFactory<GridBackgroundProps>(GridBackground);
