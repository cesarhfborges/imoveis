import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { startWith } from 'rxjs';
import { ContaService } from '@/app/core/services/conta.service';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfigService } from '@/app/core/services/config.service';
import { mensagemErro } from '@/app/core/services/api.service';
import { ExclusaoContaStatus, PerfilForm, TipoAnunciante, UFS, Usuario, pendenciasPerfilPublico } from '@/app/core/models/models';
import { PageHeader } from '@/app/shared/components/page-header';
import { ImageUpload } from '@/app/shared/components/image-upload';
import { RECORTES } from '@/app/shared/components/image-editor';
import { TelefoneInput } from '@/app/shared/components/telefone-input';
import { digitos, slug } from '@/app/core/pipes/formatos';
import { documentoValido, erroDocumento } from '@/app/core/pipes/documentos';
import { RadioButtonModule } from 'primeng/radiobutton';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BrasilApiService } from '@/app/core/services/brasil-api.service';
import { GeocodificacaoService } from '@/app/core/services/geocodificacao.service';
import { MapaOsm } from '@/app/shared/components/mapa-osm';
import { iniciaisDe } from '@/app/shared/components/avatar';

const ANO_ATUAL = new Date().getFullYear();
const MAX_SOBRE = 2000;

/** Meus dados (qualquer perfil): identificação, contato, atuação profissional (anunciantes), endereço e senha. */
@Component({
    selector: 'app-perfil-page',
    imports: [DatePipe, ReactiveFormsModule, InputTextModule, InputMaskModule, InputNumberModule, InputGroupModule, InputGroupAddonModule, SelectModule, TextareaModule, PasswordModule, ButtonModule, TagModule, PageHeader, ImageUpload, TelefoneInput, CheckboxModule, RadioButtonModule, DialogModule, MessageModule, RouterLink, MapaOsm],
    template: `
        <app-page-header titulo="Meus dados" subtitulo="Como você aparece no portal e como os clientes falam com você" />

        @if (exclusao()?.removerEm; as data) {
            <p-message severity="warn" icon="pi pi-clock" styleClass="mb-4">
                <span>
                    <strong>Sua conta será removida em {{ data | date: "dd/MM/yyyy 'às' HH:mm" }}.</strong> Todos os seus dados serão apagados. Mudou de ideia? Use <strong>Desistir da remoção</strong> no fim desta página.
                </span>
            </p-message>
        }

        <div class="perfil">
            <!-- cartão lateral: foto, resumo e completude -->
            <aside class="perfil__lado">
                <div class="card !mb-0 flex flex-col items-center text-center gap-3">
                    <app-image-upload
                        rotulo="Foto ou logo"
                        formato="circulo"
                        [vertical]="true"
                        [iniciais]="iniciais()"
                        [permitirUrl]="false"
                        endpoint="/app/conta/foto"
                        aceitar="image/png,image/jpeg,image/webp"
                        dica="JPG, PNG ou WEBP · você enquadra a foto antes de enviar"
                        [recorte]="recorteFoto"
                        [url]="dados.controls.fotoUrl.value"
                        (urlChange)="mudarFoto($event)"
                    />
                    <div class="min-w-0 w-full">
                        <div class="text-lg font-semibold truncate">{{ nome() || 'Seu nome' }}</div>
                        <div class="text-sm text-muted-color truncate">{{ usuario()?.email }}</div>
                    </div>
                    <div class="flex flex-wrap justify-center gap-2">
                        <p-tag [value]="tipoRotulo()" [severity]="anunciante() ? 'info' : 'secondary'" [icon]="imobiliaria() ? 'pi pi-building' : anunciante() ? 'pi pi-id-card' : 'pi pi-user'" />
                        @if (usuario()?.creci) {
                            <p-tag [value]="'CRECI ' + usuario()!.creci + (usuario()!.creciUf ? '-' + usuario()!.creciUf : '')" severity="secondary" />
                        }
                    </div>
                    @if (usuario(); as u) {
                        <div class="text-xs text-muted-color">Cadastro em {{ u.criadoEm | date: 'dd/MM/yyyy' }}</div>
                        @if (anunciante()) {
                            @if (u.perfilPublico) {
                                <a [routerLink]="['/anunciante', u.id, slug(u.nome)]" class="text-sm text-primary font-medium hover:underline"><i class="pi pi-external-link mr-1" aria-hidden="true"></i>Ver meu perfil público</a>
                            } @else {
                                <span class="text-xs text-muted-color"><i class="pi pi-eye-slash mr-1" aria-hidden="true"></i>Perfil público desligado</span>
                            }
                        }
                    }
                </div>

                <div class="card !mb-0">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-semibold">Perfil completo</span>
                        <span class="font-semibold" [class.text-green-700]="completude().pct === 100">{{ completude().pct }}%</span>
                    </div>
                    <div class="perfil__barra" role="progressbar" [attr.aria-valuenow]="completude().pct" aria-valuemin="0" aria-valuemax="100" aria-label="Perfil completo">
                        <span [style.width.%]="completude().pct"></span>
                    </div>
                    @if (completude().faltando.length) {
                        <p class="text-sm text-muted-color mt-3 mb-1">{{ anunciante() ? 'Perfis completos passam mais confiança aos clientes.' : 'Complete para agilizar seus contatos.' }} Falta:</p>
                        <ul class="list-none p-0 m-0 flex flex-col gap-1 text-sm">
                            @for (f of completude().faltando; track f) {
                                <li><i class="pi pi-circle text-xs text-muted-color mr-2" aria-hidden="true"></i>{{ f }}</li>
                            }
                        </ul>
                    } @else {
                        <p class="text-sm text-green-700 mt-2! mb-0"><i class="pi pi-check-circle mr-1" aria-hidden="true"></i>Tudo preenchido.</p>
                    }
                </div>
            </aside>

            <div class="perfil__principal">
                <form class="flex flex-col gap-4" [formGroup]="dados" (ngSubmit)="salvar()" novalidate>
                    <!-- identificação -->
                    <section class="card !mb-0" aria-labelledby="sec-id">
                        <h2 id="sec-id" class="perfil__titulo"><i class="pi pi-id-card" aria-hidden="true"></i>{{ imobiliaria() ? 'Dados da imobiliária' : 'Dados pessoais' }}</h2>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-nome">{{ imobiliaria() ? 'Nome fantasia (como aparece nos anúncios)' : 'Nome completo' }} <span class="text-red-600" aria-hidden="true">*</span></label>
                                <input pInputText id="pf-nome" formControlName="nome" autocomplete="name" aria-required="true" [attr.aria-invalid]="invalido('nome')" aria-describedby="pf-nome-erro" />
                                @if (invalido('nome')) {
                                    <small id="pf-nome-erro" class="text-red-600">Informe o nome.</small>
                                }
                            </div>
                            @if (imobiliaria()) {
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-razao">Razão social</label>
                                    <input pInputText id="pf-razao" formControlName="razaoSocial" autocomplete="organization" />
                                </div>
                            }
                            <div class="flex flex-col gap-2">
                                <label for="pf-email">E-mail de acesso</label>
                                <input pInputText id="pf-email" [value]="usuario()?.email ?? ''" readonly aria-describedby="pf-email-dica" />
                                <small id="pf-email-dica" class="text-muted-color">Usado para entrar. Para trocar, fale com o suporte.</small>
                            </div>
                            @if (anunciante()) {
                                <fieldset class="border-0 p-0 m-0 sm:col-span-2">
                                    <legend class="mb-2">Você anuncia como</legend>
                                    <div class="flex flex-wrap gap-5">
                                        <label for="pf-tipo-pf" class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipoAnunciante" name="pf-tipo-anunciante" value="CORRETOR" inputId="pf-tipo-pf" /> Corretor (CPF)</label>
                                        <label for="pf-tipo-pj" class="flex items-center gap-2 cursor-pointer"><p-radiobutton formControlName="tipoAnunciante" name="pf-tipo-anunciante" value="IMOBILIARIA" inputId="pf-tipo-pj" /> Imobiliária (CNPJ)</label>
                                    </div>
                                </fieldset>
                                <div class="flex flex-col gap-2">
                                    <label for="pf-doc">{{ imobiliaria() ? 'CNPJ' : 'CPF' }}</label>
                                    <!-- trocar Corretor/Imobiliária troca a máscara e limpa o campo (CPF e CNPJ têm tamanhos diferentes) -->
                                    <p-inputmask
                                        inputId="pf-doc"
                                        formControlName="documento"
                                        [mask]="imobiliaria() ? '99.999.999/9999-99' : '999.999.999-99'"
                                        [unmask]="true"
                                        [autoClear]="false"
                                        inputmode="numeric"
                                        [fluid]="true"
                                        [invalid]="invalido('documento')"
                                        [placeholder]="imobiliaria() ? '12.345.678/0001-90' : '123.456.789-09'"
                                        [attr.aria-describedby]="invalido('documento') ? 'pf-doc-erro' : null"
                                    />
                                    @if (invalido('documento')) {
                                        <small id="pf-doc-erro" class="text-red-600">{{ erroDoc() }}</small>
                                    }
                                </div>
                            }
                        </div>
                    </section>

                    <!-- contato -->
                    <section class="card !mb-0" aria-labelledby="sec-contato">
                        <h2 id="sec-contato" class="perfil__titulo"><i class="pi pi-phone" aria-hidden="true"></i>Contato</h2>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="flex flex-col gap-2">
                                <label for="pf-tel">Telefone</label>
                                <app-telefone-input inputId="pf-tel" formControlName="telefone" />
                            </div>
                            <div class="flex flex-col gap-2">
                                <label for="pf-whats">WhatsApp</label>
                                <app-telefone-input inputId="pf-whats" formControlName="whatsapp" />
                                @if (dados.controls.telefone.value && !dados.controls.whatsapp.value) {
                                    <button type="button" class="perfil__link" (click)="dados.controls.whatsapp.setValue(dados.controls.telefone.value)">Usar o mesmo número do telefone</button>
                                }
                            </div>
                            @if (anunciante()) {
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-email-contato">E-mail para clientes</label>
                                    <input
                                        pInputText
                                        id="pf-email-contato"
                                        type="email"
                                        formControlName="emailContato"
                                        autocomplete="email"
                                        placeholder="Deixe vazio para usar o e-mail de acesso"
                                        [attr.aria-invalid]="invalido('emailContato')"
                                        aria-describedby="pf-email-contato-erro"
                                    />
                                    @if (invalido('emailContato')) {
                                        <small id="pf-email-contato-erro" class="text-red-600">E-mail inválido.</small>
                                    }
                                </div>
                            }
                        </div>
                    </section>

                    <!-- atuação profissional -->
                    @if (anunciante()) {
                        <section class="card !mb-0" aria-labelledby="sec-atuacao">
                            <h2 id="sec-atuacao" class="perfil__titulo"><i class="pi pi-briefcase" aria-hidden="true"></i>Atuação profissional</h2>
                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
                                <div class="flex flex-col gap-2 sm:col-span-3">
                                    <label for="pf-creci">CRECI</label>
                                    <input pInputText id="pf-creci" formControlName="creci" />
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-1">
                                    <label for="pf-creci-uf">UF</label>
                                    <p-select inputId="pf-creci-uf" formControlName="creciUf" [options]="ufs" placeholder="UF" [showClear]="true" appendTo="body" />
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-desde">Atua desde</label>
                                    <p-inputnumber inputId="pf-desde" formControlName="atuandoDesde" [useGrouping]="false" [min]="1950" [max]="anoAtual" placeholder="Ano" />
                                    @if (anosExperiencia(); as a) {
                                        <small class="text-muted-color">{{ a }} {{ a === 1 ? 'ano' : 'anos' }} de mercado</small>
                                    }
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-6">
                                    <label for="pf-regioes">Regiões de atuação</label>
                                    <input pInputText id="pf-regioes" formControlName="regioesAtuacao" placeholder="Ex.: Asa Sul, Águas Claras, Lago Sul" aria-describedby="pf-regioes-dica" />
                                    <small id="pf-regioes-dica" class="text-muted-color">Separe por vírgula.</small>
                                    @if (regioes().length) {
                                        <ul class="list-none p-0 m-0 flex flex-wrap gap-2" aria-label="Regiões informadas">
                                            @for (r of regioes(); track r) {
                                                <li class="perfil__chip">{{ r }}</li>
                                            }
                                        </ul>
                                    }
                                </div>
                                <div class="flex flex-col gap-2 sm:col-span-6">
                                    <label for="pf-sobre">Sobre {{ imobiliaria() ? 'a imobiliária' : 'você' }}</label>
                                    <textarea pTextarea id="pf-sobre" formControlName="sobre" rows="5" [maxlength]="maxSobre" placeholder="Conte sua experiência, especialidades e como você trabalha" aria-describedby="pf-sobre-cont"></textarea>
                                    <small id="pf-sobre-cont" class="text-muted-color text-right">{{ (dados.controls.sobre.value || '').length }} / {{ maxSobre }}</small>
                                </div>
                            </div>

                            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-color mt-5 mb-3">Na internet</h3>
                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div class="flex flex-col gap-2 sm:col-span-2">
                                    <label for="pf-site">Site</label>
                                    <p-inputgroup>
                                        <p-inputgroup-addon><i class="pi pi-globe" aria-hidden="true"></i></p-inputgroup-addon>
                                        <input pInputText id="pf-site" type="url" formControlName="site" placeholder="https://www.seusite.com.br" [attr.aria-invalid]="invalido('site')" aria-describedby="pf-site-erro" />
                                    </p-inputgroup>
                                    @if (invalido('site')) {
                                        <small id="pf-site-erro" class="text-red-600">Comece com http:// ou https://</small>
                                    }
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="pf-insta">Instagram</label>
                                    <p-inputgroup>
                                        <p-inputgroup-addon>&#64;</p-inputgroup-addon>
                                        <input pInputText id="pf-insta" formControlName="instagram" placeholder="seuusuario" />
                                    </p-inputgroup>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <label for="pf-face">Facebook</label>
                                    <p-inputgroup>
                                        <p-inputgroup-addon><i class="pi pi-facebook" aria-hidden="true"></i></p-inputgroup-addon>
                                        <input pInputText id="pf-face" formControlName="facebook" placeholder="facebook.com/suapagina" />
                                    </p-inputgroup>
                                </div>
                            </div>
                        </section>
                    }

                    <!-- endereço -->
                    <section class="card !mb-0" aria-labelledby="sec-end">
                        <h2 id="sec-end" class="perfil__titulo"><i class="pi pi-map-marker" aria-hidden="true"></i>{{ anunciante() ? 'Endereço comercial' : 'Endereço' }}</h2>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-6">
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-cep">CEP</label>
                                <p-inputgroup>
                                    <p-inputmask inputId="pf-cep" formControlName="cep" mask="99.999-999" [unmask]="true" [autoClear]="false" placeholder="00.000-000" autocomplete="postal-code" inputmode="numeric" (keydown.enter)="$event.preventDefault(); buscarCep()" />
                                    <p-inputgroup-addon>
                                        <p-button type="button" icon="pi pi-search" severity="secondary" ariaLabel="Buscar endereço pelo CEP" [loading]="buscandoCep()" (onClick)="buscarCep()" />
                                    </p-inputgroup-addon>
                                </p-inputgroup>
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-4">
                                <label for="pf-logr">Logradouro</label>
                                <input pInputText id="pf-logr" formControlName="logradouro" autocomplete="address-line1" placeholder="Rua, quadra, conjunto…" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-num">Número</label>
                                <input pInputText id="pf-num" formControlName="numero" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-4">
                                <label for="pf-compl">Complemento</label>
                                <input pInputText id="pf-compl" formControlName="complemento" autocomplete="address-line2" placeholder="Sala, bloco, loja…" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-2">
                                <label for="pf-bairro">Bairro</label>
                                <input pInputText id="pf-bairro" formControlName="bairro" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-3">
                                <label for="pf-cidade">Cidade</label>
                                <input pInputText id="pf-cidade" formControlName="cidade" autocomplete="address-level2" />
                            </div>
                            <div class="flex flex-col gap-2 sm:col-span-1">
                                <label for="pf-uf">UF</label>
                                <p-select inputId="pf-uf" formControlName="uf" [options]="ufs" placeholder="UF" [showClear]="true" appendTo="body" />
                            </div>
                        </div>
                        <!-- posição no mapa: o perfil público e o diretório de imobiliárias usam este ponto -->
                        <div class="flex flex-col gap-3 mt-5">
                            <div class="flex flex-wrap items-center gap-3">
                                <p-button type="button" label="Localizar endereço no mapa" icon="pi pi-map-marker" [outlined]="true" size="small" [loading]="localizando()" (onClick)="localizar()" />
                                @if (posicao(); as p) {
                                    <span class="text-xs text-muted-color">Posição marcada ({{ p[0] }}, {{ p[1] }}) · clique no mapa para ajustar</span>
                                } @else {
                                    <span class="text-xs text-muted-color">{{ anunciante() ? 'Obrigatório para o perfil público. ' : '' }}Busque pelo endereço ou clique no mapa para marcar.</span>
                                }
                            </div>
                            <app-mapa-osm [selecionavel]="true" [centro]="centroMapa()" [zoom]="12" altura="280px" (posicaoSelecionada)="marcar($event.lat, $event.lng)" />
                        </div>
                    </section>

                    @if (anunciante()) {
                        <!-- perfil público: só liga com o cadastro completo (o backend confere a mesma regra) -->
                        <section class="card !mb-0" aria-labelledby="sec-publico">
                            <h2 id="sec-publico" class="perfil__titulo"><i class="pi pi-globe" aria-hidden="true"></i>Perfil público</h2>
                            <p class="text-sm text-muted-color mt-0 mb-4">
                                Com o perfil público, {{ imobiliaria() ? 'sua imobiliária aparece' : 'você aparece' }} no mapa de <a routerLink="/imobiliarias" class="text-primary hover:underline">Imobiliárias e corretores</a>, com uma página que mostra seus dados de contato e todos os seus anúncios.
                            </p>
                            <div class="mb-5">
                                <app-image-upload
                                    rotulo="Capa do perfil"
                                    formato="capa"
                                    [permitirUrl]="false"
                                    endpoint="/app/conta/capa"
                                    aceitar="image/png,image/jpeg,image/webp"
                                    dica="Faixa fina (1600 × 200). Você enquadra antes de enviar e ela aparece assim no perfil. Sem capa, o perfil usa o fundo padrão do site."
                                    [recorte]="recorteCapa"
                                    [url]="dados.controls.capaUrl.value"
                                    (urlChange)="mudarCapa($event)"
                                />
                            </div>
                            <label class="flex items-start gap-3" [class.opacity-60]="!podeAtivar() && !dados.controls.perfilPublico.value">
                                <p-checkbox formControlName="perfilPublico" [binary]="true" inputId="pf-publico" [ariaLabelledBy]="'pf-publico-rotulo'" aria-describedby="pf-publico-dica" />
                                <span id="pf-publico-rotulo" class="font-medium">Ativar meu perfil público</span>
                            </label>
                            <div id="pf-publico-dica" class="mt-4">
                                @if (pendencias().length) {
                                    <p class="text-sm mt-0 mb-2" [class.text-red-600]="dados.controls.perfilPublico.value" [class.text-muted-color]="!dados.controls.perfilPublico.value">
                                        {{ dados.controls.perfilPublico.value ? 'Para salvar com o perfil ativo, complete:' : 'Para ativar, complete o cadastro:' }}
                                    </p>
                                }
                                <ul class="perfil__requisitos">
                                    @for (r of requisitos(); track r.nome) {
                                        <li [class.ok]="r.ok">
                                            <i [class]="r.ok ? 'pi pi-check-circle' : 'pi pi-circle'" aria-hidden="true"></i>{{ r.nome }}<span class="sr-only">{{ r.ok ? ' (ok)' : ' (pendente)' }}</span>
                                        </li>
                                    }
                                </ul>
                            </div>
                        </section>
                    }

                    <div class="perfil__acoes">
                        <span class="text-sm text-muted-color">{{ dados.dirty ? 'Há alterações não salvas.' : 'Tudo salvo.' }}</span>
                        <!-- celular: os botões dividem a largura e, se não couberem lado a lado, um fica embaixo do outro -->
                        <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                            <p-button label="Descartar" severity="secondary" [text]="true" [disabled]="!dados.dirty || salvando()" (onClick)="descartar()" class="flex-1 sm:flex-none" styleClass="w-full whitespace-nowrap" />
                            <p-button type="submit" label="Salvar alterações" icon="pi pi-check" [loading]="salvando()" [disabled]="!dados.dirty" class="flex-1 sm:flex-none" styleClass="w-full whitespace-nowrap" />
                        </div>
                    </div>
                </form>

                <!-- senha -->
                <form class="card !mb-0" [formGroup]="senha" (ngSubmit)="trocarSenha()" aria-labelledby="sec-senha">
                    <h2 id="sec-senha" class="perfil__titulo"><i class="pi pi-lock" aria-hidden="true"></i>Segurança</h2>
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label for="pf-atual">Senha atual</label>
                            <p-password inputId="pf-atual" formControlName="atual" [feedback]="false" [toggleMask]="true" [fluid]="true" autocomplete="current-password" />
                        </div>
                        <div class="flex flex-col gap-2">
                            <label for="pf-nova">Nova senha (mínimo 8 caracteres)</label>
                            <p-password inputId="pf-nova" formControlName="nova" [toggleMask]="true" [fluid]="true" autocomplete="new-password" />
                        </div>
                    </div>
                    <div class="flex justify-end mt-4"><p-button type="submit" label="Trocar senha" severity="secondary" [outlined]="true" icon="pi pi-key" [loading]="trocando()" /></div>
                </form>

                <!-- remover conta (LGPD): só com a regra ligada, ou com um pedido já em andamento -->
                @if (exclusao(); as ex) {
                    @if (ex.disponivel || ex.removerEm) {
                        <section class="card !mb-0 border border-red-200 dark:border-red-900" aria-labelledby="sec-remover">
                            <h2 id="sec-remover" class="perfil__titulo"><i class="pi pi-trash" aria-hidden="true"></i>Remover conta</h2>
                            @if (ex.removerEm) {
                                <p class="m-0 mb-4">
                                    A remoção da sua conta está agendada para <strong>{{ ex.removerEm | date: "dd/MM/yyyy 'às' HH:mm" }}</strong>. Nessa hora, a conta e todos os seus dados são apagados de vez. Até lá tudo continua funcionando, e você pode desistir.
                                </p>
                                <div class="flex justify-end">
                                    <p-button label="Desistir da remoção" icon="pi pi-undo" severity="secondary" [outlined]="true" [loading]="processandoExclusao()" (onClick)="desistirExclusao()" />
                                </div>
                            } @else {
                                <p class="m-0 mb-4">
                                    Apaga sua conta e todos os seus dados do site{{ anunciante() ? ', incluindo seus anúncios, fotos e contatos recebidos' : '' }}. A remoção acontece {{ ex.diasEspera === 1 ? '1 dia' : ex.diasEspera + ' dias' }} depois do pedido; até lá a conta continua funcionando e você pode desistir.
                                </p>
                                <div class="flex justify-end">
                                    <p-button label="Remover conta" icon="pi pi-trash" severity="danger" [outlined]="true" (onClick)="abrirExclusao()" />
                                </div>
                            }
                        </section>
                    }
                }
            </div>
        </div>

        <p-dialog [blockScroll]="true" [visible]="dialogoExclusao()" (visibleChange)="!$event && fecharExclusao()" [modal]="true" header="Remover sua conta" [style]="{ width: '32rem' }" [breakpoints]="{ '575px': '95vw' }">
            @if (exclusao(); as ex) {
                <form class="flex flex-col gap-4" id="form-exclusao" (ngSubmit)="pedirExclusao()">
                    <p-message severity="warn" icon="pi pi-exclamation-triangle">Depois da data abaixo, não há como recuperar a conta.</p-message>
                    <p class="m-0">
                        Se confirmar agora, sua conta e seus dados serão apagados em <strong>{{ ex.removerSePedirAgora | date: "dd/MM/yyyy 'às' HH:mm" }}</strong>: dados pessoais, favoritos, contatos enviados, notificações{{ anunciante() ? ', anúncios com fotos, contatos recebidos e tokens de API' : '' }}.
                    </p>
                    <p class="m-0 text-sm text-muted-color">Até lá você continua usando o site normalmente e pode desistir aqui mesmo, em Meus dados.</p>
                    <div class="flex flex-col gap-2">
                        <label for="pf-exc-senha">Para confirmar, digite sua senha</label>
                        <p-password inputId="pf-exc-senha" [formControl]="senhaExclusao" [feedback]="false" [toggleMask]="true" [fluid]="true" autocomplete="current-password" />
                    </div>
                </form>
            }
            <ng-template #footer>
                <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="fecharExclusao()" />
                <p-button label="Agendar remoção" icon="pi pi-trash" severity="danger" [disabled]="!senhaExclusaoValor()" [loading]="processandoExclusao()" (onClick)="pedirExclusao()" />
            </ng-template>
        </p-dialog>
    `,
    styles: `
        .perfil {
            display: grid;
            /* uma coluna que nunca passa da tela (sem isto a coluna "auto" crescia até o conteúdo) */
            grid-template-columns: minmax(0, 1fr);
            gap: 1.5rem;
            align-items: start;
        }
        @media (min-width: 992px) {
            .perfil {
                grid-template-columns: 19rem minmax(0, 1fr);
            }
            .perfil__lado {
                position: sticky;
                top: 6rem;
            }
        }
        .perfil__lado,
        .perfil__principal {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            min-width: 0;
        }
        .perfil__titulo {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 1.25rem;
        }
        .perfil__titulo i {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2rem;
            height: 2rem;
            border-radius: 8px;
            font-size: 0.95rem;
            color: var(--p-primary-color);
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
        }
        .perfil__barra {
            height: 0.5rem;
            border-radius: 999px;
            overflow: hidden;
            background: var(--p-surface-200);
        }
        :host-context(.app-dark) .perfil__barra {
            background: var(--p-surface-700);
        }
        .perfil__barra span {
            display: block;
            height: 100%;
            border-radius: inherit;
            background: var(--p-primary-color);
            transition: width 0.3s;
        }
        .perfil__chip {
            font-size: 0.8rem;
            padding: 0.2rem 0.6rem;
            border-radius: 999px;
            background: color-mix(in srgb, var(--p-primary-color), transparent 88%);
            color: var(--p-primary-color);
        }
        .perfil__link {
            align-self: flex-start;
            padding: 0;
            border: 0;
            background: none;
            font-size: 0.85rem;
            color: var(--p-primary-color);
            cursor: pointer;
        }
        .perfil__link:hover {
            text-decoration: underline;
        }
        .perfil__requisitos {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            /* min(): em telas com menos de 14rem a coluna encolhe em vez de vazar */
            grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
            gap: 0.4rem 1rem;
            font-size: 0.875rem;
            color: var(--p-text-muted-color);
        }
        .perfil__requisitos li {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .perfil__requisitos li.ok {
            color: var(--p-text-color);
        }
        .perfil__requisitos li.ok i {
            color: var(--p-green-600);
        }
        .perfil__acoes {
            position: sticky;
            bottom: 0;
            z-index: 2;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border: 1px solid var(--p-content-border-color);
            border-radius: var(--p-content-border-radius, 12px);
            background: var(--p-content-background);
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.04);
        }
        @media (prefers-reduced-motion: reduce) {
            .perfil__barra span {
                transition: none;
            }
        }
    `
})
export class PerfilPage {
    readonly recorteFoto = RECORTES.fotoPerfil;
    readonly recorteCapa = RECORTES.capaPerfil;
    private conta = inject(ContaService);
    private auth = inject(AuthService);
    private msg = inject(MessageService);
    private fb = inject(NonNullableFormBuilder);
    private brasilApi = inject(BrasilApiService);
    private geo = inject(GeocodificacaoService);
    readonly slug = slug;

    readonly ufs = UFS;
    readonly anoAtual = ANO_ATUAL;
    readonly maxSobre = MAX_SOBRE;

    usuario = signal<Usuario | null>(null);
    /** "Remover conta" (LGPD): situação do pedido; nulo enquanto carrega ou se falhar. */
    exclusao = signal<ExclusaoContaStatus | null>(null);
    dialogoExclusao = signal(false);
    processandoExclusao = signal(false);
    senhaExclusao = new FormControl('', { nonNullable: true });
    senhaExclusaoValor = toSignal(this.senhaExclusao.valueChanges, { initialValue: '' });
    salvando = signal(false);
    trocando = signal(false);
    buscandoCep = signal(false);
    localizando = signal(false);
    /** Centro do mapa (muda ao localizar/carregar; o clique no mapa só move o marcador). */
    centroMapa = signal<[number, number] | null>(null);

    anunciante = computed(() => !!this.usuario()?.papeis.includes('CORRETOR'));
    /** Segue a escolha no formulário (rótulos e máscara do CPF/CNPJ mudam na hora). */
    imobiliaria = computed(() => (this.valores(), this.anunciante() && this.dados.controls.tipoAnunciante.value === 'IMOBILIARIA'));
    tipoRotulo = computed(() => (this.imobiliaria() ? 'Imobiliária' : this.anunciante() ? 'Corretor' : 'Cliente'));

    dados = this.fb.group({
        nome: ['', [Validators.required, Validators.maxLength(120)]],
        razaoSocial: [''],
        telefone: this.fb.control<string | null>(null),
        whatsapp: this.fb.control<string | null>(null),
        emailContato: ['', Validators.email],
        fotoUrl: this.fb.control<string | null>(null),
        creci: [''],
        creciUf: this.fb.control<string | null>(null),
        atuandoDesde: this.fb.control<number | null>(null),
        regioesAtuacao: [''],
        sobre: ['', Validators.maxLength(MAX_SOBRE)],
        site: ['', Validators.pattern(/^$|^https?:\/\/\S+$/i)],
        instagram: [''],
        facebook: [''],
        cep: [''],
        logradouro: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        cidade: [''],
        uf: this.fb.control<string | null>(null),
        latitude: this.fb.control<number | null>(null),
        longitude: this.fb.control<number | null>(null),
        perfilPublico: [false],
        capaUrl: this.fb.control<string | null>(null),
        tipoAnunciante: this.fb.control<TipoAnunciante>('CORRETOR'),
        documento: ['', (c: AbstractControl) => this.validarDocumento(c)]
    });

    senha = this.fb.group({
        atual: ['', Validators.required],
        nova: ['', [Validators.required, Validators.minLength(8)]]
    });

    private valores = toSignal(this.dados.valueChanges.pipe(startWith(null)));
    nome = computed(() => (this.valores(), this.dados.controls.nome.value.trim()));
    iniciais = computed(() => (this.nome() ? iniciaisDe(this.nome()) : null));
    regioes = computed(() => (this.valores(), separarRegioes(this.dados.controls.regioesAtuacao.value)));
    anosExperiencia = computed(() => {
        this.valores();
        const a = this.dados.controls.atuandoDesde.value;
        return a && a <= ANO_ATUAL ? Math.max(ANO_ATUAL - a, 0) || null : null;
    });

    /** O que ainda falta para o perfil ficar completo (o que os clientes mais olham). */
    completude = computed(() => {
        this.valores();
        const v = this.dados.getRawValue();
        const itens: [string, unknown][] = [
            ['Foto ou logo', v.fotoUrl],
            ['Nome', v.nome.trim()],
            ['Telefone', v.telefone],
            ['WhatsApp', v.whatsapp],
            ['Cidade e UF', v.cidade.trim() && v.uf]
        ];
        if (this.anunciante()) {
            itens.push(['CRECI', v.creci.trim() && v.creciUf], ['Regiões de atuação', v.regioesAtuacao.trim()], ['Apresentação ("Sobre")', v.sobre.trim()], ['Ano em que começou a atuar', v.atuandoDesde]);
            if (this.imobiliaria()) itens.push(['Razão social', v.razaoSocial.trim()]);
        }
        const faltando = itens.filter(([, ok]) => !ok).map(([n]) => n);
        return { pct: Math.round(((itens.length - faltando.length) / itens.length) * 100), faltando };
    });

    posicao = computed<[number, number] | null>(() => {
        this.valores();
        const { latitude, longitude } = this.dados.getRawValue();
        return latitude != null && longitude != null ? [latitude, longitude] : null;
    });

    /** Requisitos do perfil público, na ordem em que aparecem na tela (com ✓ quando ok). */
    requisitos = computed(() => {
        this.valores();
        const v = this.dados.getRawValue();
        const faltando = new Set(pendenciasPerfilPublico({ ...v, imobiliaria: this.imobiliaria() }));
        const todos = ['Foto ou logo', 'Nome', ...(this.imobiliaria() ? ['Razão social'] : []), 'CRECI e UF do CRECI', 'Telefone ou WhatsApp', 'Apresentação ("Sobre")', 'CEP', 'Logradouro e número', 'Bairro, cidade e UF', 'Posição no mapa'];
        return todos.map((nome) => ({ nome, ok: !faltando.has(nome) }));
    });
    pendencias = computed(() => this.requisitos().filter((r) => !r.ok));
    podeAtivar = computed(() => this.pendencias().length === 0);

    constructor() {
        inject(ConfigService).definirTitulo('Meus dados');
        // não deixa marcar o perfil público com o cadastro incompleto (desmarcar é sempre permitido)
        this.dados.controls.perfilPublico.valueChanges.subscribe((ligado) => {
            // calcula na hora: durante o reset() os computed ainda podem ter os valores antigos
            if (ligado && pendenciasPerfilPublico({ ...this.dados.getRawValue(), imobiliaria: this.imobiliaria() }).length) {
                // depois do clique: o p-checkbox termina de tratar o próprio clique e sobrescreveria a tela
                setTimeout(() => this.dados.controls.perfilPublico.setValue(false, { emitEvent: false }));
                this.msg.add({ severity: 'warn', summary: 'Perfil público', detail: 'Complete os itens da lista para ativar o perfil público.' });
            }
        });
        // CPF e CNPJ têm máscaras de tamanhos diferentes: ao trocar o tipo, o campo começa do zero
        // (só quando a troca é do usuário; o reset() ao carregar deixa o controle intacto)
        this.dados.controls.tipoAnunciante.valueChanges.subscribe(() => {
            const doc = this.dados.controls.documento;
            if (this.dados.controls.tipoAnunciante.dirty) doc.reset('');
            doc.updateValueAndValidity();
        });
        this.conta.exclusao().subscribe({ next: (s) => this.exclusao.set(s), error: () => this.exclusao.set(null) });
        this.conta.perfil().subscribe({
            next: (u) => this.preencher(u),
            error: (e) => this.msg.add({ severity: 'error', summary: 'Meus dados', detail: mensagemErro(e) })
        });
    }

    /** CPF/CNPJ do anunciante: obrigatório se já havia um ou se trocou o tipo; o gravado sem mudança não é revalidado. */
    private validarDocumento(c: AbstractControl): ValidationErrors | null {
        const u = this.usuario();
        if (!u?.papeis.includes('CORRETOR')) return null;
        const tipo = this.dados?.controls.tipoAnunciante.value ?? 'CORRETOR';
        const tipoMudou = tipo !== (u.tipoAnunciante ?? 'CORRETOR');
        const d = digitos(c.value);
        if (!d) return u.documento || tipoMudou ? { required: true } : null;
        if (d === u.documento && !tipoMudou) return null;
        const imobiliaria = tipo === 'IMOBILIARIA';
        if (d.length < (imobiliaria ? 14 : 11)) return { incompleto: true };
        return documentoValido(d, imobiliaria) ? null : { documento: true };
    }

    erroDoc() {
        return erroDocumento(this.dados.controls.documento.errors, this.imobiliaria());
    }

    invalido(campo: keyof typeof this.dados.controls) {
        const c = this.dados.controls[campo];
        return c.invalid && (c.touched || c.dirty);
    }

    /** A foto é salva junto com o resto; marca o formulário como alterado. */
    mudarFoto(url: string | null) {
        this.dados.controls.fotoUrl.setValue(url);
        this.dados.markAsDirty();
    }

    /** A capa é salva junto com o resto; null = volta ao fundo padrão. */
    mudarCapa(url: string | null) {
        this.dados.controls.capaUrl.setValue(url);
        this.dados.markAsDirty();
    }

    marcar(lat: number, lng: number) {
        this.dados.patchValue({ latitude: lat, longitude: lng });
        this.dados.markAsDirty();
    }

    /** Preenche o endereço pelo CEP (BrasilAPI) e já posiciona o mapa. */
    async buscarCep() {
        const cep = digitos(this.dados.controls.cep.value);
        if (cep.length !== 8) {
            this.msg.add({ severity: 'warn', summary: 'CEP', detail: 'Informe um CEP com 8 dígitos.' });
            return;
        }
        this.buscandoCep.set(true);
        try {
            const r = await firstValueFrom(this.brasilApi.cep(cep));
            const uf = r.state?.toUpperCase();
            this.dados.patchValue({
                ...(r.street ? { logradouro: r.street } : {}),
                ...(r.neighborhood ? { bairro: r.neighborhood } : {}),
                ...(r.city ? { cidade: r.city } : {}),
                ...(uf && UFS.includes(uf) ? { uf } : {})
            });
            this.dados.markAsDirty();
            await this.localizar();
        } catch (e) {
            const naoEncontrado = e instanceof HttpErrorResponse && e.status === 404;
            this.msg.add({ severity: naoEncontrado ? 'warn' : 'error', summary: 'CEP', detail: naoEncontrado ? 'CEP não encontrado.' : 'Não foi possível consultar o CEP agora.' });
        } finally {
            this.buscandoCep.set(false);
        }
    }

    /** Posiciona o mapa pelo endereço (Nominatim, do mais preciso ao mais genérico). */
    async localizar() {
        const v = this.dados.getRawValue();
        if (!v.cidade.trim() && digitos(v.cep).length !== 8) {
            this.msg.add({ severity: 'warn', summary: 'Mapa', detail: 'Preencha ao menos a cidade ou o CEP.' });
            return;
        }
        this.localizando.set(true);
        try {
            const r = await this.geo.localizar({ endereco: v.logradouro, numero: v.numero, bairro: v.bairro, cidade: v.cidade, uf: v.uf, cep: v.cep }).catch(() => null);
            if (!r) {
                this.msg.add({ severity: 'info', summary: 'Endereço não encontrado', detail: 'Clique no mapa para marcar a posição.' });
                return;
            }
            this.marcar(r.lat, r.lng);
            this.centroMapa.set([r.lat, r.lng]);
            if (r.precisao !== 'endereco') {
                this.msg.add({ severity: 'info', summary: 'Posição aproximada', detail: 'Clique no mapa para ajustar o ponto exato.' });
            }
        } finally {
            this.localizando.set(false);
        }
    }

    descartar() {
        const u = this.usuario();
        if (u) this.preencher(u);
    }

    salvar() {
        if (this.dados.invalid) {
            this.dados.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Confira os campos destacados' });
            return;
        }
        const v = this.dados.getRawValue();
        const t = (s: string) => s.trim() || null;
        const form: PerfilForm = {
            nome: v.nome.trim(),
            razaoSocial: t(v.razaoSocial),
            telefone: v.telefone || null,
            whatsapp: v.whatsapp || null,
            emailContato: t(v.emailContato),
            fotoUrl: v.fotoUrl,
            creci: t(v.creci),
            creciUf: v.creciUf || null,
            atuandoDesde: v.atuandoDesde,
            regioesAtuacao: separarRegioes(v.regioesAtuacao).join(', ') || null,
            sobre: t(v.sobre),
            site: t(v.site),
            instagram: t(v.instagram),
            facebook: t(v.facebook),
            cep: t(v.cep.replace(/\D/g, '')),
            logradouro: t(v.logradouro),
            numero: t(v.numero),
            complemento: t(v.complemento),
            bairro: t(v.bairro),
            cidade: t(v.cidade),
            uf: v.uf || null,
            latitude: v.latitude,
            longitude: v.longitude,
            perfilPublico: this.anunciante() && v.perfilPublico,
            capaUrl: this.anunciante() ? v.capaUrl : null,
            tipoAnunciante: this.anunciante() ? v.tipoAnunciante : null,
            documento: this.anunciante() ? digitos(v.documento) || null : null
        };
        this.salvando.set(true);
        this.conta.salvarPerfil(form).subscribe({
            next: (u) => {
                this.salvando.set(false);
                this.preencher(u);
                this.auth.recarregar().subscribe();
                this.msg.add({ severity: 'success', summary: 'Dados salvos' });
            },
            error: (e) => {
                this.salvando.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível salvar', detail: mensagemErro(e) });
            }
        });
    }

    abrirExclusao() {
        this.senhaExclusao.reset('');
        this.dialogoExclusao.set(true);
    }

    fecharExclusao() {
        if (!this.processandoExclusao()) this.dialogoExclusao.set(false);
    }

    pedirExclusao() {
        const senha = this.senhaExclusao.value;
        if (!senha || this.processandoExclusao()) return;
        this.processandoExclusao.set(true);
        this.conta.pedirExclusao(senha).subscribe({
            next: (s) => {
                this.processandoExclusao.set(false);
                this.exclusao.set(s);
                this.dialogoExclusao.set(false);
                const data = s.removerEm ? formatDate(s.removerEm, "dd/MM/yyyy 'às' HH:mm", 'pt-BR') : '';
                this.msg.add({ severity: 'warn', summary: 'Remoção agendada', detail: `Sua conta e seus dados serão apagados em ${data}. Até lá você pode desistir.`, life: 8000 });
            },
            error: (e) => {
                this.processandoExclusao.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível agendar', detail: mensagemErro(e) });
            }
        });
    }

    desistirExclusao() {
        this.processandoExclusao.set(true);
        this.conta.desistirExclusao().subscribe({
            next: (s) => {
                this.processandoExclusao.set(false);
                this.exclusao.set(s);
                this.msg.add({ severity: 'success', summary: 'Remoção cancelada', detail: 'Sua conta continua normalmente. Nada foi apagado.' });
            },
            error: (e) => {
                this.processandoExclusao.set(false);
                this.msg.add({ severity: 'error', summary: 'Não foi possível desistir', detail: mensagemErro(e) });
            }
        });
    }

    trocarSenha() {
        if (this.senha.invalid) {
            this.senha.markAllAsTouched();
            this.msg.add({ severity: 'warn', summary: 'Senha', detail: 'Informe a senha atual e uma nova com pelo menos 8 caracteres.' });
            return;
        }
        const v = this.senha.getRawValue();
        this.trocando.set(true);
        this.conta.trocarSenha(v.atual, v.nova).subscribe({
            next: () => {
                this.trocando.set(false);
                this.senha.reset();
                this.msg.add({ severity: 'success', summary: 'Senha alterada' });
            },
            error: (e) => {
                this.trocando.set(false);
                this.msg.add({ severity: 'error', summary: 'Erro', detail: mensagemErro(e) });
            }
        });
    }

    private preencher(u: Usuario) {
        this.usuario.set(u);
        this.dados.reset({
            nome: u.nome,
            razaoSocial: u.razaoSocial ?? '',
            telefone: u.telefone,
            whatsapp: u.whatsapp ?? null,
            emailContato: u.emailContato ?? '',
            fotoUrl: u.fotoUrl,
            creci: u.creci ?? '',
            creciUf: u.creciUf ?? null,
            atuandoDesde: u.atuandoDesde ?? null,
            regioesAtuacao: u.regioesAtuacao ?? '',
            sobre: u.sobre ?? '',
            site: u.site ?? '',
            instagram: u.instagram ?? '',
            facebook: u.facebook ?? '',
            cep: (u.cep ?? '').replace(/\D/g, ''),
            logradouro: u.logradouro ?? '',
            numero: u.numero ?? '',
            complemento: u.complemento ?? '',
            bairro: u.bairro ?? '',
            cidade: u.cidade ?? '',
            uf: u.uf ?? null,
            latitude: u.latitude ?? null,
            longitude: u.longitude ?? null,
            perfilPublico: !!u.perfilPublico,
            capaUrl: u.capaUrl ?? null,
            tipoAnunciante: u.tipoAnunciante === 'IMOBILIARIA' ? 'IMOBILIARIA' : 'CORRETOR',
            documento: u.documento ?? ''
        });
        this.centroMapa.set(u.latitude != null && u.longitude != null ? [u.latitude, u.longitude] : null);
    }
}

function separarRegioes(v: string): string[] {
    return [
        ...new Set(
            v
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
        )
    ];
}
