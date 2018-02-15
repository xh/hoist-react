import { Position, Toaster } from '@blueprintjs/core';

/** Singleton toaster instance. Create separate instances for different options. */
export const ClipboardToaster = Toaster.create({
    position: Position.BOTTOM_RIGHT
});