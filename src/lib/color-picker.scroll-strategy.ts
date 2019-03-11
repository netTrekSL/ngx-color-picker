import { InjectionToken } from '@angular/core';
import { Overlay, ScrollStrategy } from '@angular/cdk/overlay';

/** Injection token that determines the scroll handling while the picker is open. */
export const COLOR_PICKER_SCROLL_STRATEGY =
    new InjectionToken<() => ScrollStrategy> ( 'color-picker-scroll-strategy' );

/** @docs-private */
export function COLOR_PICKER_SCROLL_STRATEGY_FACTORY ( overlay: Overlay ): () => ScrollStrategy {
    return () => overlay.scrollStrategies.reposition ();
}

/** @docs-private */
export const COLOR_PICKER_SCROLL_STRATEGY_FACTORY_PROVIDER = {
    provide   : COLOR_PICKER_SCROLL_STRATEGY,
    deps      : [ Overlay ],
    useFactory: COLOR_PICKER_SCROLL_STRATEGY_FACTORY,
};
