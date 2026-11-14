/** Build de produção. */
export const environment = {
    production: true,
    /** Prefixo da API (vazio = mesmo domínio do site). */
    apiUrl: '',
    /**
     * Quando a API não responde (ex.: o site publicado só como arquivos estáticos),
     * o front passa a usar dados de demonstração guardados no navegador.
     * Coloque false quando o backend estiver sempre disponível.
     */
    demoFallback: true
};
