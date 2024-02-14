/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {Fragment} from 'react';

//--------------------------------
// React
//--------------------------------
export const fragment = elementFactory(Fragment);

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
export const a = elementFactory<JSX.IntrinsicElements['a']>('a');
export const br = elementFactory<JSX.IntrinsicElements['br']>('br');
export const code = elementFactory<JSX.IntrinsicElements['code']>('code');
export const div = elementFactory<JSX.IntrinsicElements['div']>('div');
export const form = elementFactory<JSX.IntrinsicElements['form']>('form');
export const hr = elementFactory<JSX.IntrinsicElements['hr']>('hr');
export const h1 = elementFactory<JSX.IntrinsicElements['h1']>('h1');
export const h2 = elementFactory<JSX.IntrinsicElements['h2']>('h2');
export const h3 = elementFactory<JSX.IntrinsicElements['h3']>('h3');
export const h4 = elementFactory<JSX.IntrinsicElements['h4']>('h4');
export const label = elementFactory<JSX.IntrinsicElements['label']>('label');
export const li = elementFactory<JSX.IntrinsicElements['li']>('li');
export const nav = elementFactory<JSX.IntrinsicElements['nav']>('nav');
export const ol = elementFactory<JSX.IntrinsicElements['ol']>('ol');
export const option = elementFactory<JSX.IntrinsicElements['option']>('option');
export const p = elementFactory<JSX.IntrinsicElements['p']>('p');
export const pre = elementFactory<JSX.IntrinsicElements['pre']>('pre');
export const span = elementFactory<JSX.IntrinsicElements['span']>('span');
export const strong = elementFactory<JSX.IntrinsicElements['strong']>('strong');
export const table = elementFactory<JSX.IntrinsicElements['table']>('table');
export const tbody = elementFactory<JSX.IntrinsicElements['tbody']>('tbody');
export const td = elementFactory<JSX.IntrinsicElements['td']>('td');
export const th = elementFactory<JSX.IntrinsicElements['th']>('th');
export const thead = elementFactory<JSX.IntrinsicElements['thead']>('thead');
export const tr = elementFactory<JSX.IntrinsicElements['tr']>('tr');
export const ul = elementFactory<JSX.IntrinsicElements['ul']>('ul');
