import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';

/** Fixo (10 dígitos): (99) 9999-9999; o "?9" deixa digitar o 11º dígito, quando a máscara passa a ser de celular. */
const MASCARA_FIXO = '(99) 9999-9999?9';
const MASCARA_CELULAR = '(99) 99999-9999';

export function digitos(v: string | null | undefined): string {
    return (v ?? '').replace(/\D/g, '');
}

/** Formata 10 ou 11 dígitos: (61) 3333-4444 ou (61) 99999-8888. */
export function formatarTelefone(v: string | null | undefined): string | null {
    const d = digitos(v);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return v?.trim() || null;
}

/**
 * Campo de telefone com a máscara do PrimeNG (pInputMask) que se ajusta ao número:
 * (99) 99999-9999 para celular (11 dígitos) ou (99) 9999-9999 para fixo (10 dígitos).
 * Usa-se como qualquer campo de formulário (formControlName/ngModel); o valor é o número formatado
 * (ou nulo se vazio) e o campo fica inválido ({ telefone: true }) com número incompleto.
 */
@Component({
    selector: 'app-telefone-input',
    imports: [FormsModule, InputTextModule, InputMaskModule],
    providers: [
        { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TelefoneInput), multi: true },
        { provide: NG_VALIDATORS, useExisting: forwardRef(() => TelefoneInput), multi: true }
    ],
    template: `
        <input
            pInputText
            type="tel"
            autocomplete="tel"
            inputmode="tel"
            class="w-full"
            [pInputMask]="mascara()"
            [autoClear]="false"
            [id]="inputId()"
            [placeholder]="placeholder()"
            [disabled]="desabilitado()"
            [ngModel]="valor()"
            (ngModelChange)="mudou($event)"
            (input)="digitando($event)"
            (blur)="aoTocar()"
            [attr.aria-label]="ariaLabel()"
            [attr.aria-invalid]="invalido() ? 'true' : null"
        />
    `,
    host: { class: 'block' }
})
export class TelefoneInput implements ControlValueAccessor, Validator {
    inputId = input<string | null>(null);
    placeholder = input('(00) 00000-0000');
    ariaLabel = input<string | null>(null);

    valor = signal<string | null>(null);
    desabilitado = signal(false);
    private qtd = signal(0);
    mascara = computed(() => (this.qtd() > 10 ? MASCARA_CELULAR : MASCARA_FIXO));
    invalido = computed(() => this.qtd() > 0 && this.qtd() < 10);

    private onChange: (v: string | null) => void = () => undefined;
    private onTouched: () => void = () => undefined;

    writeValue(v: string | null): void {
        const f = formatarTelefone(v);
        this.qtd.set(digitos(f).length);
        this.valor.set(f);
    }

    registerOnChange(fn: (v: string | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(d: boolean): void {
        this.desabilitado.set(d);
    }

    validate(c: AbstractControl): ValidationErrors | null {
        const n = digitos(c.value).length;
        return n > 0 && n < 10 ? { telefone: true } : null;
    }

    /** A cada tecla: com mais de 10 dígitos troca para a máscara de celular (e volta ao apagar). */
    digitando(e: Event) {
        this.qtd.set(digitos((e.target as HTMLInputElement).value).length);
    }

    mudou(v: string | null) {
        this.valor.set(v);
        const d = digitos(v);
        this.qtd.set(d.length);
        this.onChange(d.length ? formatarTelefone(v) : null);
    }

    aoTocar() {
        this.onTouched();
    }
}
