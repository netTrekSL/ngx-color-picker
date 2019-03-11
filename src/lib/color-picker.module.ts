import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

import { TextDirective, SliderDirective } from './helpers';

import { ColorPickerService } from './color-picker.service';
import { ColorPickerComponent } from './color-picker.component';
import { ColorPickerDirective } from './color-picker.directive';
import { COLOR_PICKER_SCROLL_STRATEGY_FACTORY_PROVIDER } from './color-picker.scroll-strategy';

@NgModule ( {
    imports        : [
        CommonModule,
        OverlayModule,
        PortalModule
    ],
    exports        : [ ColorPickerDirective ],
    providers      : [
        ColorPickerService,
        COLOR_PICKER_SCROLL_STRATEGY_FACTORY_PROVIDER,
    ],
    declarations   : [ ColorPickerComponent, ColorPickerDirective, TextDirective, SliderDirective ],
    entryComponents: [ ColorPickerComponent ]
} )
export class ColorPickerModule {
}
