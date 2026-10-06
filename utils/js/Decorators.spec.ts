/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, autorun, observable} from '@xh/hoist/mobx';
import {computeOnce, debounced, sharePendingPromise, throwIf} from '@xh/hoist/utils/js';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Hoist's method decorators. `@debounced` buffers the server writes of PrefService, TrackService
 * and TraceService, `@computeOnce` caches derived values on app data classes, and
 * `@sharePendingPromise` de-dupes concurrent GridModel autosizing. All were rewritten for TC39
 * decorators in v85 (e213e2ce9), and so run here under the same SWC transform that apps use.
 */
describe('Decorators', () => {
    describe('@debounced', () => {
        class SearchModel {
            queries: string[] = [];

            @debounced(100)
            search(query: string) {
                this.queries.push(query);
            }
        }

        it('runs once after a quiet period, with the latest arguments', async () => {
            vi.useFakeTimers();
            const model = new SearchModel();

            model.search('a');
            await vi.advanceTimersByTimeAsync(50);
            model.search('ap');
            model.search('app');
            await vi.advanceTimersByTimeAsync(99);
            expect(model.queries).toEqual([]);

            await vi.advanceTimersByTimeAsync(1);
            expect(model.queries).toEqual(['app']);
        });

        it('debounces each instance separately', async () => {
            vi.useFakeTimers();
            const a = new SearchModel(),
                b = new SearchModel();

            a.search('AAPL');
            b.search('MSFT');
            await vi.advanceTimersByTimeAsync(100);

            expect(a.queries).toEqual(['AAPL']);
            expect(b.queries).toEqual(['MSFT']);
        });

        it('keeps a decorated @action running as an action', async () => {
            vi.useFakeTimers();
            class DealFormModel {
                @observable accessor maturity = '2026-12-31';

                @debounced(200)
                @action
                updateDerivedDates(maturity: string) {
                    this.maturity = maturity;
                }
            }
            const model = new DealFormModel(),
                seen: string[] = [];
            onTestFinished(autorun(() => seen.push(model.maturity)));

            // The setup fails this test if MobX warns of an observed change outside an action.
            model.updateDerivedDates('2027-06-30');
            await vi.advanceTimersByTimeAsync(200);

            expect(seen).toEqual(['2026-12-31', '2027-06-30']);
        });
    });

    describe('@computeOnce', () => {
        it('computes a getter once per instance', () => {
            class Trade {
                computations = 0;

                constructor(
                    readonly qty: number,
                    readonly price: number
                ) {}

                @computeOnce
                get notional() {
                    this.computations++;
                    return this.qty * this.price;
                }
            }
            const a = new Trade(100, 50),
                b = new Trade(10, 5);

            expect(a.notional).toBe(5000);
            expect(a.notional).toBe(5000);
            expect(b.notional).toBe(50);
            expect(a.computations).toBe(1);
            expect(b.computations).toBe(1);
        });

        it('computes a method once per instance', () => {
            class Report {
                builds = 0;

                @computeOnce
                buildSummary() {
                    this.builds++;
                    return {rowCount: 3};
                }
            }
            const report = new Report(),
                summary = report.buildSummary();

            expect(report.buildSummary()).toBe(summary);
            expect(report.builds).toBe(1);
        });

        it('caches a false or null result rather than recomputing it', () => {
            class Loan {
                checks = 0;

                @computeOnce
                get isEditable() {
                    this.checks++;
                    return false;
                }

                @computeOnce
                get approver() {
                    this.checks++;
                    return null;
                }
            }
            const loan = new Loan();

            expect(loan.isEditable).toBe(false);
            expect(loan.isEditable).toBe(false);
            expect(loan.approver).toBeNull();
            expect(loan.approver).toBeNull();
            expect(loan.checks).toBe(2);
        });
    });

    describe('@sharePendingPromise', () => {
        class QuoteService {
            fetchQuote = vi.fn<(symbol: string) => Promise<number>>();

            @sharePendingPromise
            loadQuoteAsync(symbol: string): Promise<number> {
                return this.fetchQuote(symbol);
            }
        }

        it('shares one pending call among concurrent callers with the same arguments', async () => {
            const svc = new QuoteService(),
                quote = deferred<number>();
            svc.fetchQuote.mockReturnValue(quote.promise);

            const first = svc.loadQuoteAsync('AAPL'),
                second = svc.loadQuoteAsync('AAPL');
            expect(second).toBe(first);
            expect(svc.fetchQuote).toHaveBeenCalledTimes(1);

            quote.resolve(187.5);
            await expect(second).resolves.toBe(187.5);
        });

        it('makes a separate call for different arguments', () => {
            const svc = new QuoteService();
            svc.fetchQuote.mockResolvedValue(100);

            const aapl = svc.loadQuoteAsync('AAPL'),
                msft = svc.loadQuoteAsync('MSFT');

            expect(msft).not.toBe(aapl);
            expect(svc.fetchQuote.mock.calls).toEqual([['AAPL'], ['MSFT']]);
        });

        it('calls again once the shared call has resolved', async () => {
            const svc = new QuoteService();
            svc.fetchQuote.mockResolvedValue(187.5);

            await svc.loadQuoteAsync('AAPL');
            await svc.loadQuoteAsync('AAPL');

            expect(svc.fetchQuote).toHaveBeenCalledTimes(2);
        });

        it('calls again after the shared call has rejected', async () => {
            const svc = new QuoteService();
            svc.fetchQuote.mockRejectedValueOnce(new Error('Feed down')).mockResolvedValue(190);

            await expect(svc.loadQuoteAsync('AAPL')).rejects.toThrow('Feed down');
            await expect(svc.loadQuoteAsync('AAPL')).resolves.toBe(190);
        });

        // BUG: utils/js/Decorators.ts:85-107 - the try/catch meant for unserializable arguments
        // also wraps the method call, so a synchronous throw is logged as a serialization failure
        // and the method is run a second time.
        it.fails('runs a method that throws synchronously only once', () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});
            class OrderService {
                calls = 0;

                @sharePendingPromise
                submitAsync(orderId: string): Promise<void> {
                    this.calls++;
                    throwIf(!orderId, 'Order ID required');
                    return Promise.resolve();
                }
            }
            const svc = new OrderService();

            expect(() => svc.submitAsync(null)).toThrow('Order ID required');
            expect(svc.calls).toBe(1);
        });
    });
});

function deferred<T>() {
    let resolve: (value: T) => void;
    const promise = new Promise<T>(res => (resolve = res));
    return {promise, resolve};
}
