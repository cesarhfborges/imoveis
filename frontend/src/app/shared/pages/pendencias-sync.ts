import { Denuncia, PendenciasImovel } from '@/app/core/models/models';

/** Aplica uma denúncia que chegou pelo socket na tela (substitui a que já existe ou acrescenta). */
export function aplicarDenuncia(p: PendenciasImovel | null, d: Denuncia): PendenciasImovel | null {
    if (!p) return p;
    const existe = p.denuncias.some((x) => x.id === d.id);
    return { ...p, denuncias: existe ? p.denuncias.map((x) => (x.id === d.id ? d : x)) : [...p.denuncias, d] };
}
