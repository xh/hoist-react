// Slider - Hoist's own markup, with Blueprint's class names until now.
const intents = ['primary', 'success', 'warning', 'danger'];
const progress = {
    'bp6-slider-progress': '.xh-slider__progress',
    '[class*=bp6-intent-]': `:is(${intents.map(i => `.xh-slider__progress--intent-${i}`).join(', ')})`
};
intents.forEach(i => (progress[`bp6-intent-${i}`] = `.xh-slider__progress--intent-${i}`));
module.exports = {
    anchors: {
        'bp6-slider': {
            'bp6-slider': '.xh-slider__body',
            'bp6-disabled': '.xh-slider__body--disabled',
            'bp6-vertical': '.xh-slider__body--vertical',
            'bp6-slider-unlabeled': '.xh-slider__body--unlabeled',
            'bp6-large': null,
            'bp6-small': null
        },
        'bp6-slider-unlabeled': {'bp6-slider-unlabeled': '.xh-slider__body--unlabeled', 'bp6-slider': '.xh-slider__body'},
        'bp6-slider-track': {'bp6-slider-track': '.xh-slider__track'},
        'bp6-slider-progress': progress,
        'bp6-slider-handle': {
            'bp6-slider-handle': '.xh-slider__handle',
            'bp6-start': '.xh-slider__handle--start',
            'bp6-end': '.xh-slider__handle--end',
            'bp6-active': '.xh-slider__handle--active',
            'bp6-disabled': null
        },
        'bp6-slider-label': {'bp6-slider-label': '.xh-slider__label'},
        'bp6-slider-axis': {'bp6-slider-axis': '.xh-slider__axis'}
    },
    contextMap: {
        'bp6-dark': '.xh-dark',
        // The disabled ancestor of a handle or track is the slider body.
        'bp6-disabled': '.xh-slider__body--disabled',
        '[data-bp-color-scheme=dark]': null,
        'bp6-large': null,
        'bp6-small': null,
        'bp6-range-slider': null,
        // Blueprint's form label markup.
        'bp6-label': null,
        'bp6-control-group': null,
        'bp6-inline': null,
        'bp6-multi-slider': null
    }
};
