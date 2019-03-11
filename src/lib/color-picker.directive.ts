import {
    Directive, OnChanges, OnDestroy, Input, Output, EventEmitter,
    HostListener, ApplicationRef, ComponentRef, ElementRef, ViewContainerRef,
    Injector, ReflectiveInjector, ComponentFactoryResolver, Inject, NgZone
} from '@angular/core';

import { ComponentPortal } from '@angular/cdk/portal';
import { Overlay, OverlayConfig, OverlayRef, PositionStrategy, ScrollStrategy } from '@angular/cdk/overlay';

import { ColorPickerService } from './color-picker.service';
import { ColorPickerComponent } from './color-picker.component';
import { COLOR_PICKER_SCROLL_STRATEGY } from './color-picker.scroll-strategy';
import { filter, take } from 'rxjs/operators';
import { merge } from 'rxjs';
import { ESCAPE, UP_ARROW } from '@angular/cdk/keycodes';

import { AlphaChannel, ColorMode, OutputFormat } from './helpers';

@Directive ( {
    selector: '[colorPicker]',
    exportAs: 'ngxColorPicker'
} )
export class ColorPickerDirective implements OnChanges, OnDestroy {
    private dialog: ColorPickerComponent;

    private dialogCreated: boolean = false;
    private ignoreChanges: boolean = false;

    private cmpRef: ComponentRef<ColorPickerComponent>;

    // overlay
    private _scrollStrategy: () => ScrollStrategy;

    /** A reference to the overlay when the calendar is opened as a popup. */
    _popupRef: OverlayRef;

    /** A portal containing the calendar for this datepicker. */
    private _pickerPortal: ComponentPortal<ColorPickerComponent>;

    /** Reference to the component instantiated in popup mode. */
    private _popupComponentRef: ComponentRef<ColorPickerComponent> | null;

    @Input () colorPicker: string;

    @Input () cpWidth: string  = '230px';
    @Input () cpHeight: string = 'auto';

    @Input () cpToggle: boolean   = false;
    @Input () cpDisabled: boolean = false;

    @Input () cpIgnoredElements: any = [];

    @Input () cpFallbackColor: string = '';

    @Input () cpColorMode: ColorMode = 'color';

    @Input () cpOutputFormat: OutputFormat = 'auto';
    @Input () cpAlphaChannel: AlphaChannel = 'enabled';

    @Input () cpDisableInput: boolean = false;

    @Input () cpDialogDisplay: string = 'popup';

    @Input () cpSaveClickOutside: boolean  = true;
    @Input () cpCloseClickOutside: boolean = true;

    // @Input() cpUseRootViewContainer: boolean = false;

    @Input () cpPosition: string                 = 'right';
    @Input () cpPositionOffset: string           = '0%';
    @Input () cpPositionRelativeToArrow: boolean = false;

    @Input () cpOKButton: boolean     = false;
    @Input () cpOKButtonText: string  = 'OK';
    @Input () cpOKButtonClass: string = 'cp-ok-button-class';

    @Input () cpCancelButton: boolean     = false;
    @Input () cpCancelButtonText: string  = 'Cancel';
    @Input () cpCancelButtonClass: string = 'cp-cancel-button-class';

    @Input () cpPresetLabel: string           = 'Preset colors';
    @Input () cpPresetColors: string[];
    @Input () cpMaxPresetColorsLength: number = 6;

    @Input () cpPresetEmptyMessage: string      = 'No colors added';
    @Input () cpPresetEmptyMessageClass: string = 'preset-empty-message';

    @Input () cpAddColorButton: boolean     = false;
    @Input () cpAddColorButtonText: string  = 'Add color';
    @Input () cpAddColorButtonClass: string = 'cp-add-color-button-class';

    @Input () cpRemoveColorButtonClass: string = 'cp-remove-color-button-class';

    @Output () cpInputChange = new EventEmitter<any> ( true );

    @Output () cpToggleChange = new EventEmitter<boolean> ( true );

    @Output () cpSliderChange    = new EventEmitter<any> ( true );
    @Output () cpSliderDragEnd   = new EventEmitter<string> ( true );
    @Output () cpSliderDragStart = new EventEmitter<string> ( true );

    @Output () colorPickerOpen  = new EventEmitter<string> ( true );
    @Output () colorPickerClose = new EventEmitter<string> ( true );

    @Output () colorPickerCancel = new EventEmitter<string> ( true );
    @Output () colorPickerSelect = new EventEmitter<string> ( true );
    @Output () colorPickerChange = new EventEmitter<string> ( false );

    @Output () cpPresetColorsChange = new EventEmitter<any> ( true );

    @HostListener ( 'click' ) handleClick (): void {
        this.inputFocus ();
    }

    @HostListener ( 'focus' ) handleFocus (): void {
        this.inputFocus ();
    }

    @HostListener ( 'input', [ '$event' ] ) handleInput ( event: any ): void {
        this.inputChange ( event );
    }

    constructor ( private _overlay: Overlay,
                  private injector: Injector,
                  private cfr: ComponentFactoryResolver,
                  private appRef: ApplicationRef,
                  private vcRef: ViewContainerRef,
                  private elRef: ElementRef,
                  private _ngZone: NgZone,
                  private _service: ColorPickerService,
                  @Inject ( COLOR_PICKER_SCROLL_STRATEGY ) scrollStrategy: any ) {

        this._scrollStrategy = scrollStrategy;
    }

    ngOnDestroy (): void {
        if ( this.cmpRef !== undefined ) {
            this.cmpRef.destroy ();
        }
    }

    ngOnChanges ( changes: any ): void {
        if ( changes.cpToggle && ! this.cpDisabled ) {
            if ( changes.cpToggle.currentValue ) {
                this.openDialog ();
            } else if ( ! changes.cpToggle.currentValue ) {
                this.closeDialog ();
            }
        }

        if ( changes.colorPicker ) {
            if ( this.dialog && ! this.ignoreChanges ) {
                if ( this.cpDialogDisplay === 'inline' ) {
                    this.dialog.setInitialColor ( changes.colorPicker.currentValue );
                }

                this.dialog.setColorFromString ( changes.colorPicker.currentValue, false );

                /*if (this.cpUseRootViewContainer && this.cpDialogDisplay !== 'inline') {
                  this.cmpRef.changeDetectorRef.detectChanges();
                }*/
            }

            this.ignoreChanges = false;
        }

        if ( changes.cpPresetLabel || changes.cpPresetColors ) {
            if ( this.dialog ) {
                this.dialog.setPresetConfig ( this.cpPresetLabel, this.cpPresetColors );
            }
        }
    }

    /*
    public openDialog(): void {
      if (!this.dialogCreated) {
        let vcRef = this.vcRef;

        this.dialogCreated = true;

        if (this.cpUseRootViewContainer && this.cpDialogDisplay !== 'inline') {
          const classOfRootComponent = this.appRef.componentTypes[0];
          const appInstance = this.injector.get(classOfRootComponent);

          vcRef = appInstance.vcRef || appInstance.viewContainerRef || this.vcRef;

          if (vcRef === this.vcRef) {
            console.warn('You are using cpUseRootViewContainer, ' +
              'but the root component is not exposing viewContainerRef!' +
              'Please expose it by adding \'public vcRef: ViewContainerRef\' to the constructor.');
          }
        }

        const compFactory = this.cfr.resolveComponentFactory(ColorPickerComponent);
        const injector = ReflectiveInjector.fromResolvedProviders([], vcRef.parentInjector);

        this.cmpRef = vcRef.createComponent(compFactory, 0, injector, []);

        this.cmpRef.instance.setupDialog(this, this.elRef, this.colorPicker,
          this.cpWidth, this.cpHeight, this.cpDialogDisplay, this.cpFallbackColor,
          this.cpColorMode, this.cpAlphaChannel, this.cpOutputFormat, this.cpDisableInput,
          this.cpIgnoredElements, this.cpSaveClickOutside, this.cpCloseClickOutside,
          this.cpUseRootViewContainer, this.cpPosition, this.cpPositionOffset,
          this.cpPositionRelativeToArrow, this.cpPresetLabel, this.cpPresetColors,
          this.cpMaxPresetColorsLength, this.cpPresetEmptyMessage, this.cpPresetEmptyMessageClass,
          this.cpOKButton, this.cpOKButtonClass, this.cpOKButtonText,
          this.cpCancelButton, this.cpCancelButtonClass, this.cpCancelButtonText,
          this.cpAddColorButton, this.cpAddColorButtonClass, this.cpAddColorButtonText,
          this.cpRemoveColorButtonClass);

        this.dialog = this.cmpRef.instance;

        if (this.vcRef !== vcRef) {
          this.cmpRef.changeDetectorRef.detectChanges();
        }
      } else if (this.dialog) {
        this.dialog.openDialog(this.colorPicker);
      }
    }
    */

    /** Open the calendar as a popup. */
    public openDialog (): void {
        if ( ! this._pickerPortal ) {
            const injector     = ReflectiveInjector.fromResolvedProviders ( [], this.vcRef.parentInjector );
            this._pickerPortal = new ComponentPortal<ColorPickerComponent> ( ColorPickerComponent, this.vcRef, injector );
        }

        if ( ! this._popupRef ) {
            this._createPopup ();
        }

        if ( ! this._popupRef.hasAttached () ) {
            this._popupComponentRef = this._popupRef.attach ( this._pickerPortal );

            this.dialog = this._popupComponentRef.instance;
            this.dialog.setupDialog ( this, this.elRef, this.colorPicker,
                this.cpWidth, this.cpHeight, this.cpDialogDisplay, this.cpFallbackColor,
                this.cpColorMode, this.cpAlphaChannel, this.cpOutputFormat,
                this.cpDisableInput, this.cpIgnoredElements, this.cpSaveClickOutside,
                this.cpCloseClickOutside, // this.cpUseRootViewContainer, this.cpPosition,
                /* this.cpPositionOffset, this.cpPositionRelativeToArrow, */ this.cpPresetLabel,
                this.cpPresetColors, this.cpMaxPresetColorsLength, this.cpPresetEmptyMessage,
                this.cpPresetEmptyMessageClass, this.cpOKButton, this.cpOKButtonClass,
                this.cpOKButtonText, this.cpCancelButton, this.cpCancelButtonClass,
                this.cpCancelButtonText, this.cpAddColorButton, this.cpAddColorButtonClass,
                this.cpAddColorButtonText, this.cpRemoveColorButtonClass );
            this.dialog.init ();
            this.dialogCreated = true;

            // Update the position once the calendar has rendered.
            this._ngZone.onStable.asObservable ()
                .pipe ( take ( 1 ) )
                .subscribe ( () => {
                    this._popupRef.updatePosition ();
                } );
        }
    }

    /** Create the popup. */
    private _createPopup (): void {
        const overlayConfig = new OverlayConfig ( {
            positionStrategy: this._createPopupPositionStrategy (),
            hasBackdrop     : true,
            backdropClass   : 'mat-overlay-transparent-backdrop',
            // todo direction: this._dir,
            scrollStrategy  : this._scrollStrategy (),
            panelClass      : 'mat-datepicker-popup',
        } );

        this._popupRef = this._overlay.create ( overlayConfig );
        this._popupRef.overlayElement.setAttribute ( 'role', 'dialog' );

        merge (
            this._popupRef.backdropClick (),
            this._popupRef.detachments (),
            this._popupRef.keydownEvents ()
                .pipe ( filter ( event => {
                    // Closing on alt + up is only valid when there's an input associated with the datepicker.
                    return event.keyCode === ESCAPE ||
                        (/* todo this._datepickerInput &&*/ event.altKey && event.keyCode === UP_ARROW);
                } ) )
        )
            .subscribe ( () => this.closeDialog () );
    }

    /** Create the popup PositionStrategy. */
    private _createPopupPositionStrategy (): PositionStrategy {
        return this._overlay.position ()
                   .flexibleConnectedTo ( this.elRef )
                   .withTransformOriginOn ( '.color-picker' )
                   .withFlexibleDimensions ( false )
                   .withViewportMargin ( 8 )
                   .withLockedPosition ()
                   .withPositions ( [
                       {
                           originX : 'start',
                           originY : 'bottom',
                           overlayX: 'start',
                           overlayY: 'top'
                       },
                       {
                           originX : 'start',
                           originY : 'top',
                           overlayX: 'start',
                           overlayY: 'bottom'
                       },
                       {
                           originX : 'end',
                           originY : 'bottom',
                           overlayX: 'end',
                           overlayY: 'top'
                       },
                       {
                           originX : 'end',
                           originY : 'top',
                           overlayX: 'end',
                           overlayY: 'bottom'
                       }
                   ] );
    }

    /*
    public closeDialog(): void {
      if (this.dialog && this.cpDialogDisplay === 'popup') {
        this.dialog.closeDialog();
      }
    }
    */

    public closeDialog (): void {

        console.log ( 'closeDialog' );
        /*
        if (!this._opened) {
          return;
        }
        */
        if ( this._popupRef && this._popupRef.hasAttached () ) {
            this._popupRef.detach ();
        }
        /*
        if (this._dialogRef) {
          this._dialogRef.close();
          this._dialogRef = null;
        }
        */
        if ( this._pickerPortal && this._pickerPortal.isAttached ) {
            this._pickerPortal.detach ();
        }

        /*
        const completeClose = () => {
          // The `_opened` could've been reset already if
          // we got two events in quick succession.
          if (this._opened) {
            this._opened = false;
            this.closedStream.emit();
            this._focusedElementBeforeOpen = null;
          }
        };

        if (this._focusedElementBeforeOpen &&
          typeof this._focusedElementBeforeOpen.focus === 'function') {
          // Because IE moves focus asynchronously, we can't count on it being restored before we've
          // marked the datepicker as closed. If the event fires out of sequence and the element that
          // we're refocusing opens the datepicker on focus, the user could be stuck with not being
          // able to close the calendar at all. We work around it by making the logic, that marks
          // the datepicker as closed, async as well.
          this._focusedElementBeforeOpen.focus();
          setTimeout(completeClose);
        } else {
          completeClose();
        }
        */
    }

    public stateChanged ( state: boolean ): void {
        this.cpToggleChange.emit ( state );

        if ( state ) {
            this.colorPickerOpen.emit ( this.colorPicker );
        } else {
            this.colorPickerClose.emit ( this.colorPicker );
        }
    }

    public colorChanged ( value: string, ignore: boolean = true ): void {
        this.ignoreChanges = ignore;

        this.colorPickerChange.emit ( value );
    }

    public colorCanceled (): void {
        this.colorPickerCancel.emit ();
    }

    public colorSelected ( value: string ): void {
        this.colorPickerSelect.emit ( value );
    }

    public inputFocus (): void {
        const element = this.elRef.nativeElement;

        const ignored = this.cpIgnoredElements.filter ( ( item: any ) => item === element );

        if ( ! this.cpDisabled && ! ignored.length ) {
            if ( typeof document !== 'undefined' && element === document.activeElement ) {
                this.openDialog ();
            } else if ( ! this.dialog || ! this.dialog.show ) {
                this.openDialog ();
            } else {
                this.closeDialog ();
            }
        }
    }

    public inputChange ( event: any ): void {
        if ( this.dialog ) {
            this.dialog.setColorFromString ( event.target.value, true );
        } else {
            this.colorPicker = event.target.value;

            this.colorPickerChange.emit ( this.colorPicker );
        }
    }

    public inputChanged ( event: any ): void {
        this.cpInputChange.emit ( event );
    }

    public sliderChanged ( event: any ): void {
        this.cpSliderChange.emit ( event );
    }

    public sliderDragEnd ( event: any ): void {
        this.cpSliderDragEnd.emit ( event );
    }

    public sliderDragStart ( event: any ): void {
        this.cpSliderDragStart.emit ( event );
    }

    public presetColorsChanged ( value: any[] ): void {
        this.cpPresetColorsChange.emit ( value );
    }
}
