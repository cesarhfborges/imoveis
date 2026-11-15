import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, of } from 'rxjs';
import Pusher, { Channel, PresenceChannel } from 'pusher-js';
import { ApiService, mensagemErro } from './api.service';
import { AuthService } from './auth.service';
import { Perfil } from '@/app/core/models/models';

/** Como o navegador se conecta (vem do backend: GET /app/public/realtime). */
interface ConfigRealtime {
    ativo: boolean;
    key: string | null;
    wsHost: string | null;
    wsPort: number | null;
    wssPort: number | null;
    wsPath: string | null;
    forceTls: boolean;
}

export type EstadoRealtime = 'desligado' | 'conectando' | 'conectado' | 'indisponivel';

/** Quem está numa sala protegida (canal presence-). */
export interface MembroSala {
    id: number;
    nome: string;
    perfil: Perfil;
}

interface Ouvinte {
    evento: string;
    fn: (dados: any) => void;
}

interface Inscricao {
    ouvintes: Set<Ouvinte>;
    canal: Channel | null;
}

/** Canal privado do usuário (notificações e contadores dele). */
export function canalDoUsuario(id: number) {
    return `private-usuario.${id}`;
}

/**
 * Tempo real (WebSocket, protocolo Pusher, servidor Soketi).
 *
 * Canais:
 *  - público (sem prefixo): qualquer um;
 *  - privado (`private-`): o backend autoriza (ex.: `private-usuario.{id}`);
 *  - protegido (`presence-`): autorizado e com a lista de quem está na sala (ex.: a conversa de uma denúncia).
 *
 * Conecta sozinho quando o usuário entra e desconecta quando sai. As páginas só pedem os eventos de que precisam
 * com `ouvir(canal, evento)`: a inscrição no canal é feita no primeiro pedido e desfeita quando o último sai
 * (inclusive os pedidos feitos antes da conexão ficar pronta, que são inscritos assim que ela abre).
 * Se o tempo real estiver desligado ou fora do ar, nada quebra: as telas continuam consultando a API.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
    private api = inject(ApiService);
    private auth = inject(AuthService);

    readonly estado = signal<EstadoRealtime>('desligado');
    readonly conectado = computed(() => this.estado() === 'conectado');

    private pusher: Pusher | null = null;
    private config: Promise<ConfigRealtime | null> | null = null;
    private inscricoes = new Map<string, Inscricao>();
    private usuarioConectado: number | null = null;

    constructor() {
        effect(() => {
            const id = this.auth.logado() ? (this.auth.usuario()?.id ?? null) : null;
            if (id !== this.usuarioConectado) {
                this.desconectar();
                if (id != null) this.conectar(id);
            }
        });
    }

    /** Eventos de um canal. Cancelar a assinatura do Observable sai do canal quando ninguém mais o usa. */
    ouvir<T>(canal: string, evento: string): Observable<T> {
        return new Observable<T>((sub) => {
            const ouvinte: Ouvinte = { evento, fn: (d) => sub.next(d as T) };
            this.adicionar(canal, ouvinte);
            return () => this.remover(canal, ouvinte);
        });
    }

    /** Quem está numa sala protegida (`presence-...`), atualizado a cada entrada e saída. */
    presenca(canal: string): Observable<MembroSala[]> {
        return new Observable<MembroSala[]>((sub) => {
            const emitir = () => sub.next(this.membros(canal));
            const ouvintes: Ouvinte[] = ['pusher:subscription_succeeded', 'pusher:member_added', 'pusher:member_removed'].map((evento) => ({ evento, fn: emitir }));
            ouvintes.forEach((o) => this.adicionar(canal, o));
            emitir();
            return () => ouvintes.forEach((o) => this.remover(canal, o));
        });
    }

    // ------------------------------------------------------------------ conexão

    private async conectar(usuarioId: number) {
        this.usuarioConectado = usuarioId;
        this.config ??= firstValueFrom(this.api.get<ConfigRealtime>('/app/public/realtime').pipe(catchError(() => of(null))));
        const cfg = await this.config;
        if (!cfg?.ativo || !cfg.key || this.usuarioConectado !== usuarioId || this.pusher) return;

        this.estado.set('conectando');
        const pusher = new Pusher(cfg.key, {
            cluster: 'mt1',
            wsHost: cfg.wsHost || location.hostname,
            wsPort: cfg.wsPort ?? 80,
            wssPort: cfg.wssPort ?? 443,
            wsPath: cfg.wsPath || '',
            forceTLS: cfg.forceTls,
            enabledTransports: ['ws', 'wss'],
            disableStats: true,
            activityTimeout: 60_000,
            pongTimeout: 15_000,
            // autorização dos canais privados/protegidos pela API do site (sessão + CSRF do próprio HttpClient)
            channelAuthorization: {
                transport: 'ajax',
                endpoint: '/app/realtime/auth',
                customHandler: ({ socketId, channelName }, callback) =>
                    this.api.post<{ auth: string; channel_data?: string }>('/app/realtime/auth', { socket_id: socketId, channel_name: channelName }).subscribe({
                        next: (r) => callback(null, r),
                        error: (e) => callback(new Error(mensagemErro(e, 'Sem acesso ao canal ' + channelName)), null)
                    })
            }
        });
        pusher.connection.bind('state_change', ({ current }: { current: string }) => {
            this.estado.set(current === 'connected' ? 'conectado' : current === 'connecting' || current === 'initialized' ? 'conectando' : current === 'disconnected' ? 'desligado' : 'indisponivel');
        });
        this.pusher = pusher;
        // pedidos feitos antes da conexão
        for (const [nome, insc] of this.inscricoes) this.inscrever(nome, insc);
    }

    private desconectar() {
        this.usuarioConectado = null;
        if (!this.pusher) return;
        this.pusher.disconnect();
        this.pusher = null;
        for (const insc of this.inscricoes.values()) insc.canal = null;
        this.estado.set('desligado');
    }

    // ------------------------------------------------------------------ canais

    private adicionar(nome: string, o: Ouvinte) {
        let insc = this.inscricoes.get(nome);
        if (!insc) {
            insc = { ouvintes: new Set(), canal: null };
            this.inscricoes.set(nome, insc);
        }
        insc.ouvintes.add(o);
        if (this.pusher && !insc.canal) this.inscrever(nome, insc);
        else insc.canal?.bind(o.evento, o.fn);
    }

    private remover(nome: string, o: Ouvinte) {
        const insc = this.inscricoes.get(nome);
        if (!insc) return;
        insc.ouvintes.delete(o);
        insc.canal?.unbind(o.evento, o.fn);
        if (insc.ouvintes.size === 0) {
            if (insc.canal) this.pusher?.unsubscribe(nome);
            this.inscricoes.delete(nome);
        }
    }

    private inscrever(nome: string, insc: Inscricao) {
        if (!this.pusher) return;
        const canal = this.pusher.subscribe(nome);
        insc.canal = canal;
        insc.ouvintes.forEach((o) => canal.bind(o.evento, o.fn));
    }

    private membros(nome: string): MembroSala[] {
        const canal = this.inscricoes.get(nome)?.canal as PresenceChannel | null | undefined;
        const lista: MembroSala[] = [];
        canal?.members?.each((m: { id: string; info: { nome: string; perfil: Perfil } }) => lista.push({ id: Number(m.id), nome: m.info?.nome ?? '', perfil: m.info?.perfil }));
        return lista;
    }
}
