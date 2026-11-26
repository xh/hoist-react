/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {button, buttonGroup, splitButton} from '@xh/hoist/cmp/button';
import {menuButton} from '@xh/hoist/desktop/cmp/menu';
import {TaskObserver} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, vi} from 'vitest';

/**
 * The shared Button features - sizes, loading, group props and SplitButton. Platform specs in
 * `desktop/cmp/button` and `mobile/cmp/button` cover how each platform renders a button.
 */
describe('Button (shared)', () => {
    beforeAll(() => initTestAppAsync());

    it('sets a size class for a compact or large button, and none for standard', () => {
        render(button({text: 'A', size: 'compact', testId: 'a'}));
        render(button({text: 'B', size: 'large', testId: 'b'}));
        render(button({text: 'C', size: 'standard', testId: 'c'}));
        expect(screen.getByTestId('a').classList).toContain('xh-button--compact');
        expect(screen.getByTestId('b').classList).toContain('xh-button--large');
        expect(
            [...screen.getByTestId('c').classList].filter(it => /--(compact|large)$/.test(it))
        ).toEqual([]);
    });

    it('sizes a group, for the buttons in it', () => {
        render(buttonGroup({size: 'compact', testId: 'g', children: [button({text: 'A'})]}));
        expect(screen.getByTestId('g').classList).toContain('xh-button-group--compact');
    });

    it('applies a group intent, minimal and outlined to the buttons in it, over their own', () => {
        render(
            buttonGroup({
                intent: 'danger',
                outlined: true,
                minimal: false,
                children: [button({text: 'A', intent: 'primary', testId: 'a'})]
            })
        );
        const {classList} = screen.getByTestId('a');
        expect(classList).toContain('xh-button--intent-danger');
        expect(classList).toContain('xh-button--outlined');
        expect(classList).not.toContain('xh-button--minimal');
    });

    it('leaves the buttons in a group their own props when the group sets none', () => {
        render(buttonGroup({children: [button({text: 'A', intent: 'primary', testId: 'a'})]}));
        expect(screen.getByTestId('a').classList).toContain('xh-button--intent-primary');
    });

    describe('loading', () => {
        it('shows a spinner in place of the icon, keeps its text, and ignores clicks', () => {
            const onClick = vi.fn();
            render(button({text: 'Save', icon: Icon.check(), loading: true, onClick, testId: 's'}));
            const el = screen.getByTestId('s');
            expect(el.querySelector('.xh-button__spinner')).not.toBeNull();
            expect(el.querySelector('.xh-button__text').textContent).toBe('Save');
            expect(el.classList).toContain('xh-button--loading');
            expect(el.classList).not.toContain('xh-button--loading-cover');
            fireEvent.click(el);
            expect(onClick).not.toHaveBeenCalled();
        });

        it('covers the content of a button with no icon', () => {
            render(button({text: 'Save', loading: true, testId: 's'}));
            const el = screen.getByTestId('s');
            expect(el.classList).toContain('xh-button--loading-cover');
            expect(el.querySelector('.xh-button__spinner')).not.toBeNull();
        });

        it('stays focusable, and is marked busy and disabled for assistive tech', () => {
            render(button({text: 'Save', loading: true, testId: 's'}));
            const el = screen.getByTestId('s');
            expect(el.hasAttribute('disabled')).toBe(false);
            expect(el.getAttribute('aria-busy')).toBe('true');
            expect(el.getAttribute('aria-disabled')).toBe('true');
            el.focus();
            expect(document.activeElement).toBe(el);
        });

        it('follows a TaskObserver while its task is pending', async () => {
            const task = TaskObserver.trackLast(),
                onClick = vi.fn();
            let resolve: () => void;
            render(button({text: 'Save', loading: task, onClick, testId: 's'}));
            const el = screen.getByTestId('s');
            expect(el.classList).not.toContain('xh-button--loading');

            act(() => {
                new Promise<void>(r => (resolve = r)).linkTo(task);
            });
            expect(el.classList).toContain('xh-button--loading');
            fireEvent.click(el);
            expect(onClick).not.toHaveBeenCalled();

            await act(async () => resolve());
            expect(el.classList).not.toContain('xh-button--loading');
            fireEvent.click(el);
            expect(onClick).toHaveBeenCalledOnce();
        });
    });

    describe('SplitButton', () => {
        const menuItems = [{text: 'Save As...', actionFn: vi.fn()}];

        it('renders a primary button and a menu button, each with its own tab stop', () => {
            const onClick = vi.fn();
            render(splitButton({text: 'Save', onClick, menuItems, testId: 'split'}));
            const primary = screen.getByTestId('split-button'),
                arrow = screen.getByTestId('split-menu-button');
            expect(primary.tagName).toBe('BUTTON');
            expect(arrow.tagName).toBe('BUTTON');
            expect(primary.tabIndex).toBe(0);
            expect(arrow.tabIndex).toBe(0);

            fireEvent.click(primary);
            expect(onClick).toHaveBeenCalledOnce();
        });

        it('names its menu button from the primary text, and marks it as opening a menu', () => {
            render(splitButton({text: 'Save', menuItems, testId: 'split'}));
            const arrow = screen.getByTestId('split-menu-button');
            expect(arrow.getAttribute('aria-label')).toBe('More Save options');
            expect(arrow.getAttribute('aria-haspopup')).toBe('menu');
            expect(arrow.getAttribute('aria-expanded')).toBe('false');
        });

        it('opens its menu from the arrow button', async () => {
            render(splitButton({text: 'Save', menuItems, testId: 'split'}));
            fireEvent.click(screen.getByTestId('split-menu-button'));
            expect(await screen.findByText('Save As...')).toBeTruthy();
            expect(screen.getByTestId('split-menu-button').getAttribute('aria-expanded')).toBe(
                'true'
            );
        });

        it('applies its intent, style and disabled state to both buttons', () => {
            render(
                splitButton({
                    text: 'Delete',
                    intent: 'danger',
                    outlined: true,
                    disabled: true,
                    menuItems,
                    testId: 'split'
                })
            );
            for (const id of ['split-button', 'split-menu-button']) {
                const el = screen.getByTestId(id);
                expect(el.classList).toContain('xh-button--intent-danger');
                expect(el.classList).toContain('xh-button--outlined');
                expect(el.hasAttribute('disabled')).toBe(true);
            }
        });

        it('takes props for its menu button, such as its own disabled state', () => {
            render(
                splitButton({
                    text: 'Save',
                    menuItems,
                    menuButtonProps: {disabled: true},
                    testId: 'split'
                })
            );
            expect(screen.getByTestId('split-button').hasAttribute('disabled')).toBe(false);
            expect(screen.getByTestId('split-menu-button').hasAttribute('disabled')).toBe(true);
        });
    });

    it('joins a MenuButton in a group like a plain button', () => {
        render(
            buttonGroup({
                testId: 'g',
                children: [button({text: 'A'}), menuButton({text: 'More', menuItems: []})]
            })
        );
        expect(screen.getByTestId('g').querySelectorAll('button')).toHaveLength(2);
    });
});
