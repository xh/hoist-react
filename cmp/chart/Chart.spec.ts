/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {chart, ChartModel} from '@xh/hoist/cmp/chart';
import {installHighcharts} from '@xh/hoist/kit/highcharts';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

describe('Chart', () => {
    beforeAll(() => initTestAppAsync());

    it('leaves one resize observer watching the page however often its config changes', async () => {
        const {build, observed} = installLeakyHighcharts(),
            model = new ChartModel({highchartsConfig: {title: {text: 'A'}}});
        onTestFinished(() => model.destroy());
        // jsdom has no layout: a chart is built only into a parent with a size.
        const width = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(400),
            height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
        onTestFinished(() => {
            width.mockRestore();
            height.mockRestore();
        });

        render(chart({model}));
        await settle();
        for (let i = 0; i < 5; i++) {
            act(() => model.setHighchartsConfig({title: {text: `B${i}`}}));
            await settle();
        }

        expect(build).toHaveBeenCalledTimes(6);
        expect(observed.filter(it => it.isConnected)).toHaveLength(1);
    });
});

//------------------
// Test support
//------------------
// Lets the chart's reactions run, which build it after a tick.
async function settle() {
    await act(() => new Promise(resolve => setTimeout(resolve, 0)));
}

// A fake Highcharts that records each chart's render target, which 12.x's setReflow() observes for good.
function installLeakyHighcharts() {
    const observed: HTMLElement[] = [],
        build = vi.fn((config: any) => {
            observed.push(config.chart.renderTo);
            return {destroy: () => {}, fullscreen: {isOpen: false}, setSize: () => {}};
        });
    installHighcharts({version: '12.4.0', setOptions: () => {}, chart: build});
    return {build, observed};
}
