import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, defer, from, of, switchMap, throwError } from 'rxjs';
import { environment } from '@/environments/environment';
import { DemoBackend, DemoError } from '@/app/core/demo/demo-backend';

/** Estado do modo demonstração (mostrado como aviso no site). */
@Injectable({ providedIn: 'root' })
export class DemoModeService {
    readonly ativo = signal(false);
    private backend: DemoBackend | null = null;

    get api(): DemoBackend {
        if (!this.backend) {
            this.backend = new DemoBackend();
        }
        return this.backend;
    }
}

/** A API não está lá: erro de rede, 404/405 do servidor estático, ou HTML no lugar de JSON. */
function apiAusente(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) {
        return false;
    }
    if ([0, 404, 405, 500, 501, 502, 503, 504].includes(err.status)) {
        const corpo = err.error;
        // resposta JSON da nossa API (tem "path") = erro real, não ausência da API
        return !(corpo && typeof corpo === 'object' && 'path' in corpo);
    }
    // servidor estático devolveu index.html (2xx) para a rota da API: o JSON não pôde ser lido
    if (err.status >= 200 && err.status < 300) {
        const e = err.error;
        return e instanceof SyntaxError || e?.error instanceof SyntaxError || typeof e?.text === 'string' || typeof e === 'string';
    }
    return false;
}

function lerArquivo(arquivo: File): Promise<string> {
    return new Promise((ok, falha) => {
        const r = new FileReader();
        r.onload = () => ok(String(r.result));
        r.onerror = () => falha(r.error);
        r.readAsDataURL(arquivo);
    });
}

function responder(demo: DemoModeService, req: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => {
        try {
            const body = demo.api.handle(req as HttpRequest<any>);
            if ((req.url.endsWith('/app/uploads') || req.url.endsWith('/app/conta/foto')) && req.body instanceof FormData) {
                return from(lerArquivo(req.body.get('arquivo') as File)).pipe(switchMap((url) => of(new HttpResponse({ status: 201, body: { url }, url: req.url }))));
            }
            return of(new HttpResponse({ status: 200, body, url: req.url }));
        } catch (e) {
            if (e instanceof DemoError) {
                return throwError(
                    () =>
                        new HttpErrorResponse({
                            status: e.status,
                            statusText: e.message,
                            url: req.url,
                            error: { status: e.status, error: e.message, message: e.message, path: req.url, fields: {} }
                        })
                );
            }
            return throwError(() => e);
        }
    });
}

/**
 * Tenta a API real; se ela não existir (site estático), responde com o backend de demonstração.
 * Depois da primeira falha, as chamadas seguintes vão direto para o modo demonstração.
 */
export const demoInterceptor: HttpInterceptorFn = (req, next) => {
    if (!environment.demoFallback || !req.url.includes('/app/')) {
        return next(req);
    }
    const demo = inject(DemoModeService);
    if (demo.ativo()) {
        return responder(demo, req);
    }
    return next(req).pipe(
        catchError((err) => {
            if (apiAusente(err)) {
                demo.ativo.set(true);
                return responder(demo, req);
            }
            return throwError(() => err);
        })
    );
};
