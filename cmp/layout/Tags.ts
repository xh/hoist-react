/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {elemFactory} from '@xh/hoist/core';
import {Fragment} from 'react';

//--------------------------------
// React
//--------------------------------
export const fragment = elemFactory(Fragment);

//--------------------------------
// Standard HTML
//--------------------------------
export const a = elemFactory<JSX.IntrinsicElements['a']>('a');
export const br = elemFactory<JSX.IntrinsicElements['br']>('br');
export const code = elemFactory<JSX.IntrinsicElements['code']>('code');
export const div = elemFactory<JSX.IntrinsicElements['div']>('div');
export const form = elemFactory<JSX.IntrinsicElements['form']>('form');
export const h1 = elemFactory<JSX.IntrinsicElements['h1']>('h1');
export const h2 = elemFactory<JSX.IntrinsicElements['h2']>('h2');
export const h3 = elemFactory<JSX.IntrinsicElements['h3']>('h3');
export const h4 = elemFactory<JSX.IntrinsicElements['h4']>('h4');
export const iframe = elemFactory<JSX.IntrinsicElements['iframe']>('iframe');
export const img = elemFactory<JSX.IntrinsicElements['img']>('img');
export const input = elemFactory<JSX.IntrinsicElements['input']>('input');
export const label = elemFactory<JSX.IntrinsicElements['label']>('label');
export const li = elemFactory<JSX.IntrinsicElements['li']>('li');
export const nav = elemFactory<JSX.IntrinsicElements['nav']>('nav');
export const ol = elemFactory<JSX.IntrinsicElements['ol']>('ol');
export const option = elemFactory<JSX.IntrinsicElements['option']>('option');
export const p = elemFactory<JSX.IntrinsicElements['p']>('p');
export const pre = elemFactory<JSX.IntrinsicElements['pre']>('pre');
export const span = elemFactory<JSX.IntrinsicElements['span']>('span');
export const strong = elemFactory<JSX.IntrinsicElements['strong']>('strong');
export const svg = elemFactory<JSX.IntrinsicElements['svg']>('svg');
export const table = elemFactory<JSX.IntrinsicElements['table']>('table');
export const tbody = elemFactory<JSX.IntrinsicElements['tbody']>('tbody');
export const td = elemFactory<JSX.IntrinsicElements['td']>('td');
export const textarea = elemFactory<JSX.IntrinsicElements['textarea']>('textarea');
export const th = elemFactory<JSX.IntrinsicElements['th']>('th');
export const thead = elemFactory<JSX.IntrinsicElements['thead']>('thead');
export const tr = elemFactory<JSX.IntrinsicElements['tr']>('tr');
export const ul = elemFactory<JSX.IntrinsicElements['ul']>('ul');
