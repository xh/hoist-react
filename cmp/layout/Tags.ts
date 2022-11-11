/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {elementFactory, containerElementFactory} from '@xh/hoist/core';
import {Fragment} from 'react';

//--------------------------------
// React
//--------------------------------
export const fragment = containerElementFactory(Fragment);

//-------------------------
// Leaf HTML Tags
//-------------------------
export const iframe = elementFactory<JSX.IntrinsicElements['iframe']>('iframe');
export const img = elementFactory<JSX.IntrinsicElements['img']>('img');
export const input = elementFactory<JSX.IntrinsicElements['input']>('input');
export const svg = elementFactory<JSX.IntrinsicElements['svg']>('svg');
export const textarea = elementFactory<JSX.IntrinsicElements['textarea']>('textarea');


//--------------------------------
// Container HTML Tags
//--------------------------------
export const a = containerElementFactory<JSX.IntrinsicElements['a']>('a');
export const br = containerElementFactory<JSX.IntrinsicElements['br']>('br');
export const code = containerElementFactory<JSX.IntrinsicElements['code']>('code');
export const div = containerElementFactory<JSX.IntrinsicElements['div']>('div');
export const form = containerElementFactory<JSX.IntrinsicElements['form']>('form');
export const h1 = containerElementFactory<JSX.IntrinsicElements['h1']>('h1');
export const h2 = containerElementFactory<JSX.IntrinsicElements['h2']>('h2');
export const h3 = containerElementFactory<JSX.IntrinsicElements['h3']>('h3');
export const h4 = containerElementFactory<JSX.IntrinsicElements['h4']>('h4');
export const label = containerElementFactory<JSX.IntrinsicElements['label']>('label');
export const li = containerElementFactory<JSX.IntrinsicElements['li']>('li');
export const nav = containerElementFactory<JSX.IntrinsicElements['nav']>('nav');
export const ol = containerElementFactory<JSX.IntrinsicElements['ol']>('ol');
export const option = containerElementFactory<JSX.IntrinsicElements['option']>('option');
export const p = containerElementFactory<JSX.IntrinsicElements['p']>('p');
export const pre = containerElementFactory<JSX.IntrinsicElements['pre']>('pre');
export const span = containerElementFactory<JSX.IntrinsicElements['span']>('span');
export const strong = containerElementFactory<JSX.IntrinsicElements['strong']>('strong');
export const table = containerElementFactory<JSX.IntrinsicElements['table']>('table');
export const tbody = containerElementFactory<JSX.IntrinsicElements['tbody']>('tbody');
export const td = containerElementFactory<JSX.IntrinsicElements['td']>('td');
export const th = containerElementFactory<JSX.IntrinsicElements['th']>('th');
export const thead = containerElementFactory<JSX.IntrinsicElements['thead']>('thead');
export const tr = containerElementFactory<JSX.IntrinsicElements['tr']>('tr');
export const ul = containerElementFactory<JSX.IntrinsicElements['ul']>('ul');
