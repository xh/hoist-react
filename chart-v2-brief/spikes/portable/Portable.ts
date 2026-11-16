/* eslint-disable */
/**
 * Spike: a mapped type that derives the JSON-safe ("portable") form of a Hoist code spec.
 *
 * Rules:
 *  - A function branch of a union is dropped:  Thunkable<string> -> string.
 *  - React elements and portals are dropped:    ReactNode -> string | number | boolean | Portable<ReactNode[]>.
 *  - An object with a REQUIRED key that maps to never is itself never. This drops class
 *    instances (required methods), FunctionFilterSpec (testFn), RuleSpec (check), etc.
 *  - An optional key that maps to never is removed.
 *  - Date / LocalDate map to an ISO string (the codec owns the round trip).
 *  - `any` stays `any` - it cannot be checked.
 *  - Depth is capped. Past the cap the type is `unknown` (accepts anything, checks nothing).
 */
import type {ReactElement, ReactPortal} from 'react';
import type {LocalDate} from '@xh/hoist/utils/datetime';

type Fn = (...args: any[]) => any;
type IsAny<T> = 0 extends 1 & T ? true : false;
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Values that serialize via a codec rather than structurally. */
type Codec<T> = T extends Date | LocalDate ? string : never;

/** Keys of T that are required (not optional). */
type RequiredKeys<T> = {[K in keyof T]-?: {} extends Pick<T, K> ? never : K}[keyof T];

type PortableObject<T, D extends number> = {
    [K in keyof T as [Portable<Exclude<T[K], undefined>, D>] extends [never] ? never : K]: Portable<
        T[K],
        D
    >;
};

/** never if any required key of T maps to never. */
type DropIfRequiredLost<T, D extends number> = [
    {
        [K in RequiredKeys<T>]: [Portable<Exclude<T[K], undefined>, D>] extends [never] ? K : never;
    }[RequiredKeys<T>]
] extends [never]
    ? PortableObject<T, D>
    : never;

export type Portable<T, D extends number = 10> =
    IsAny<T> extends true
        ? any
        : [D] extends [never]
          ? unknown
          : T extends Fn
            ? never
            : T extends string | number | boolean | null | undefined
              ? T
              : T extends Date | LocalDate
                ? Codec<T>
                : T extends ReactElement | ReactPortal
                  ? never
                  : T extends readonly (infer E)[]
                    ? [Portable<E, Prev[D]>] extends [never]
                        ? never
                        : Portable<E, Prev[D]>[]
                    : T extends object
                      ? DropIfRequiredLost<T, Prev[D]>
                      : never;

/**
 * Portable form with some keys replaced by explicit reference types, e.g. a renderer slot
 * becomes a registry reference instead of disappearing.
 */
export type PortableWith<T, Refs extends Partial<Record<keyof T, unknown>>> = Omit<
    Portable<T>,
    keyof Refs
> &
    Refs;

//------------------------------------------------------------------
// Registry reference: a name plus JSON args. Covers both a plain registered function and a
// configured factory such as numberRenderer({precision: 2}).
//------------------------------------------------------------------
export type Ref<N extends string = string, A = Record<string, unknown>> = N | {name: N; args?: A};
