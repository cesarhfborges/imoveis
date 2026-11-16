import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { digitos } from '@/app/core/pipes/formatos';

/** Telefones no Brasil: 10 dígitos (fixo) ou 11 (celular). */
const MAX_DIGITOS = 11;

/**
 * Formata enquanto digita, sem posições vazias ("_"):
 * "61" → "(61", "6133" → "(61) 33", "6133334444" → "(61) 3333-4444", "61999998888" → "(61) 99999-8888".
 */
export function mascararTelefone(d: string): string {
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    const ddd = `(${d.slice(0, 2)}) `;
    const resto = d.slice(2);
    if (d.length <= 6) return ddd + resto;
    const meio = d.length === MAX_DIGITOS ? 5 : 4;
    return `${ddd}${resto.slice(0, meio)}-${resto.slice(meio)}`;
}

/** Posição no texto formatado logo depois do n-ésimo dígito. */
function posicaoAposDigitos(texto: string, n: number): number {
    if (n <= 0) return texto.indexOf('(') === 0 ? Math.min(1, texto.length) : 0;
    let vistos = 0;
    for (let i = 0; i < texto.length; i++) {
        if (/\d/.test(texto[i]) && ++vistos === n) return i + 1;
    }
    return texto.length;
}

/**
 * Campo de telefone que aceita fixo e celular: (99) 9999-9999 ou (99) 99999-9999.
 * A máscara se ajusta sozinha ao número de dígitos enquanto a pessoa digita, apaga ou cola.
 * Usa-se como qualquer campo de formulário (formControlName/ngModel): na tela o número aparece formatado,
 * mas o valor do formulário é só dígitos ("61999998888", ou nulo se vazio) — exiba com o pipe "telefone".
 * O campo fica inválido ({ telefone: true }) com número incompleto (menos de 10 dígitos).
 */
@Component({
    selector: 'app-telefone-input',
    imports: [InputTextModule],
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
            [id]="inputId()"
            [placeholder]="placeholder()"
            [disabled]="desabilitado()"
            [value]="texto()"
            (input)="digitando($event)"
            (blur)="onTouched()"
            [attr.aria-label]="ariaLabel()"
            [attr.aria-invalid]="invalido() ? 'true' : null"
        />
    `,
    host: { class: 'block' }
})
export class TelefoneInput implements ControlValueAccessor, Validator {
    inputId = input<string | null>(null);
    placeholder = input('Ex.: (61) 99999-9999');
    ariaLabel = input<string | null>(null);

    private numero = signal('');
    desabilitado = signal(false);
    texto = computed(() => mascararTelefone(this.numero()));
    invalido = computed(() => this.numero().length > 0 && this.numero().length < 10);

    private onChange: (v: string | null) => void = () => undefined;
    onTouched: () => void = () => undefined;

    writeValue(v: string | null): void {
        this.numero.set(digitos(v).slice(0, MAX_DIGITOS));
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

    /**
     * Relê os dígitos do campo, refaz a máscara e devolve o cursor para depois do mesmo dígito.
     * Apagar um "(", ")", " " ou "-" apaga o dígito vizinho (senão a máscara o recolocaria e nada mudaria).
     */
    digitando(e: Event) {
        const el = e.target as HTMLInputElement;
        const tipo = (e as InputEvent).inputType ?? '';
        const cursor = el.selectionStart ?? el.value.length;
        let d = digitos(el.value);
        let antes = digitos(el.value.slice(0, cursor)).length;

        if (d === this.numero() && tipo === 'deleteContentBackward' && antes > 0) {
            d = d.slice(0, antes - 1) + d.slice(antes);
            antes--;
        } else if (d === this.numero() && tipo === 'deleteContentForward') {
            d = d.slice(0, antes) + d.slice(antes + 1);
        }
        // colado com DDI: "+55 61 99999-8888"
        if (d.length > MAX_DIGITOS && d.startsWith('55')) {
            d = d.slice(2);
            antes = Math.max(0, antes - 2);
        }
        d = d.slice(0, MAX_DIGITOS);
        antes = Math.min(antes, d.length);

        const texto = mascararTelefone(d);
        el.value = texto;
        const pos = posicaoAposDigitos(texto, antes);
        el.setSelectionRange(pos, pos);

        if (d !== this.numero()) {
            this.numero.set(d);
            this.onChange(d || null);
        }
    }
}
