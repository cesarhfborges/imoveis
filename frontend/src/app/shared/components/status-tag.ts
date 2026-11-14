import { Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { StatusAnuncio, statusInfo } from '@/app/core/models/models';

@Component({
    selector: 'app-status-tag',
    imports: [TagModule],
    template: `<p-tag [value]="info().label" [severity]="info().severity" />`
})
export class StatusTag {
    status = input.required<StatusAnuncio>();
    info = computed(() => statusInfo(this.status()));
}
