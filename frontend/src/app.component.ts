import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AceitePendente } from '@/app/shared/components/aceite-pendente';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastModule, ConfirmDialogModule, AceitePendente],
    template: `
        <p-toast position="top-right" />
        <p-confirmdialog [style]="{ width: '28rem', maxWidth: '92vw' }" />
        <router-outlet />
        <app-aceite-pendente />
    `
})
export class AppComponent {}
