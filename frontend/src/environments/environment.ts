/** Build de produção. */
export const environment = {
    production: true,
    /**
     * Prefixo da API. Vazio = caminhos relativos (/app/..., /api/...) no mesmo domínio do site:
     * o nginx de entrada encaminha para o backend, então não é preciso informar o domínio.
     */
    apiUrl: '',
    /**
     * Quando a API não responde (ex.: o site publicado só como arquivos estáticos),
     * o front passa a usar dados de demonstração guardados no navegador.
     * Desligado: em produção o backend fica sempre atrás do mesmo domínio (docker-compose.yml da raiz).
     */
    demoFallback: false
};
