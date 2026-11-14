import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@/app/core/services/auth.service';
import { Perfil } from '@/app/core/models/models';

/**
 * Libera a rota apenas para quem está logado com um dos perfis informados.
 * Sem login: vai para a tela de login da área (conta ou admin), guardando o destino.
 */
export function perfilGuard(perfis: Perfil[], loginUrl: string): CanActivateFn {
    return (_route, state) => {
        const auth = inject(AuthService);
        const router = inject(Router);
        if (!auth.logado()) {
            return router.createUrlTree([loginUrl], { queryParams: { voltar: state.url } });
        }
        const atual = auth.perfil();
        if (atual && perfis.includes(atual)) {
            return true;
        }
        return router.createUrlTree(['/acesso-negado'], { queryParams: { area: loginUrl.startsWith('/admin') ? 'admin' : 'conta' } });
    };
}

export const contaGuard = perfilGuard(['CLIENTE', 'CORRETOR'], '/conta/login');
export const corretorGuard = perfilGuard(['CORRETOR'], '/conta/login');
export const adminGuard = perfilGuard(['ADMIN'], '/admin/login');
