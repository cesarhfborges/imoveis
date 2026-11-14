package br.com.chfb.imoveis.coreapi.config;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import br.com.chfb.imoveis.coreapi.entity.Usuario;
import br.com.chfb.imoveis.coreapi.repository.UsuarioRepository;
import br.com.chfb.imoveis.listing.entity.Finalidade;
import br.com.chfb.imoveis.listing.entity.FotoImovel;
import br.com.chfb.imoveis.listing.entity.Imovel;
import br.com.chfb.imoveis.listing.entity.StatusAnuncio;
import br.com.chfb.imoveis.listing.entity.TipoImovel;
import br.com.chfb.imoveis.listing.repository.ImovelRepository;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/**
 * Dados iniciais.
 * <ul>
 *     <li>prod: cria o administrador inicial (app.bootstrap.*) se ainda não houver nenhum;</li>
 *     <li>dev (app.seed.demo=true): cria usuários e anúncios de exemplo quando o banco está vazio.</li>
 * </ul>
 * Usuários de exemplo (dev): admin@imoveis.local / admin12345, corretor@imoveis.local / corretor123,
 * cliente@imoveis.local / cliente123.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final AppProperties props;
    private final UsuarioRepository usuarios;
    private final ImovelRepository imoveis;
    private final PasswordEncoder encoder;

    public DataSeeder(AppProperties props, UsuarioRepository usuarios, ImovelRepository imoveis,
            PasswordEncoder encoder) {
        this.props = props;
        this.usuarios = usuarios;
        this.imoveis = imoveis;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        criarAdminInicial();
        if (props.seed() != null && props.seed().demo()) {
            if (imoveis.count() == 0) {
                criarDemonstracao();
            }
            preencherFotosDeTeste();
        }
    }

    private void criarAdminInicial() {
        AppProperties.Bootstrap b = props.bootstrap();
        if (b == null || !StringUtils.hasText(b.adminEmail()) || !StringUtils.hasText(b.adminSenha())) {
            return;
        }
        if (usuarios.contarPorPapel(Perfil.ADMIN) > 0 || usuarios.existsByEmailIgnoreCase(b.adminEmail())) {
            return;
        }
        usuario(StringUtils.hasText(b.adminNome()) ? b.adminNome() : "Administrador", b.adminEmail(), b.adminSenha(),
                EnumSet.allOf(Perfil.class), null);
        log.info("Administrador inicial criado: {}", b.adminEmail());
    }

    private void criarDemonstracao() {
        if (!usuarios.existsByEmailIgnoreCase("admin@imoveis.local")) {
            usuario("Administrador Demo", "admin@imoveis.local", "admin12345", EnumSet.allOf(Perfil.class), null);
        }
        Usuario corretor = usuarios.findByEmailIgnoreCase("corretor@imoveis.local").orElseGet(() -> usuario(
                "Corretora Exemplo", "corretor@imoveis.local", "corretor123",
                EnumSet.of(Perfil.CLIENTE, Perfil.CORRETOR), "12345-F"));
        Usuario corretor2 = usuarios.findByEmailIgnoreCase("imobiliaria@imoveis.local").orElseGet(() -> usuario(
                "Imobiliária Modelo", "imobiliaria@imoveis.local", "corretor123",
                EnumSet.of(Perfil.CLIENTE, Perfil.CORRETOR), "J-0420"));
        if (!usuarios.existsByEmailIgnoreCase("cliente@imoveis.local")) {
            usuario("Cliente Exemplo", "cliente@imoveis.local", "cliente123", EnumSet.of(Perfil.CLIENTE), null);
        }

        record Modelo(String titulo, TipoImovel tipo, Finalidade fin, int preco, int area, int q, int s, int v,
                String cidade, String bairro, String endereco, double lat, double lng, boolean lanc) {
        }
        List<Modelo> modelos = List.of(
                new Modelo("Cobertura duplex com vista livre", TipoImovel.COBERTURA, Finalidade.VENDA, 2450000, 212, 3, 3, 3, "Brasília", "Noroeste", "SQNW 311 Bloco H", -15.7605, -47.9150, true),
                new Modelo("Casa térrea com piscina e área gourmet", TipoImovel.CASA_CONDOMINIO, Finalidade.VENDA, 850000, 306, 5, 2, 2, "Sobradinho", "Grande Colorado", "Condomínio Jardim Europa II", -15.6560, -47.8320, false),
                new Modelo("Apartamento reformado, 2 quartos com suíte", TipoImovel.APARTAMENTO, Finalidade.VENDA, 695000, 90, 2, 1, 1, "Águas Claras", "Norte", "Rua 13 Norte", -15.8350, -48.0230, false),
                new Modelo("Apartamento 3 quartos, nascente, andar alto", TipoImovel.APARTAMENTO, Finalidade.VENDA, 1190000, 95, 3, 1, 1, "Brasília", "Asa Norte", "SQN 303", -15.7790, -47.8830, false),
                new Modelo("Kitnet mobiliada perto do metrô", TipoImovel.KITNET, Finalidade.ALUGUEL, 1800, 32, 1, 0, 1, "Águas Claras", "Sul", "Rua 7 Sul", -15.8420, -48.0290, false),
                new Modelo("Sala comercial com 2 vagas", TipoImovel.SALA, Finalidade.ALUGUEL, 3500, 45, 0, 0, 2, "Brasília", "Asa Sul", "SCS Quadra 2", -15.7980, -47.8880, false),
                new Modelo("Casa 4 quartos em lote de 800 m²", TipoImovel.CASA, Finalidade.VENDA, 1650000, 280, 4, 2, 4, "Brasília", "Lago Norte", "SHIN QI 5", -15.7270, -47.8460, false),
                new Modelo("Lote plano em condomínio fechado", TipoImovel.LOTE, Finalidade.VENDA, 420000, 800, 0, 0, 0, "Jardim Botânico", "Jardim Botânico", "Condomínio Solar", -15.8650, -47.8000, false),
                new Modelo("Apartamento 2 quartos com lazer completo", TipoImovel.APARTAMENTO, Finalidade.ALUGUEL, 3200, 68, 2, 1, 1, "Guará", "Guará II", "QE 40", -15.8320, -47.9850, false),
                new Modelo("Lançamento: studios a partir de 38 m²", TipoImovel.APARTAMENTO, Finalidade.VENDA, 389000, 38, 1, 1, 1, "Brasília", "Setor Noroeste", "SQNW 102", -15.7570, -47.9100, true),
                new Modelo("Loja de esquina com mezanino", TipoImovel.LOJA, Finalidade.ALUGUEL, 9000, 120, 0, 0, 0, "Taguatinga", "Taguatinga Centro", "CNB 12", -15.8340, -48.0570, false),
                new Modelo("Chácara com casa sede e pomar", TipoImovel.CHACARA, Finalidade.VENDA, 980000, 20000, 3, 1, 6, "Brazlândia", "Zona Rural", "Núcleo Rural Alexandre Gusmão", -15.6700, -48.1900, false),
                new Modelo("Flat mobiliado para temporada", TipoImovel.FLAT, Finalidade.TEMPORADA, 350, 40, 1, 1, 1, "Brasília", "Setor Hoteleiro Norte", "SHN Quadra 1", -15.7900, -47.8900, false),
                new Modelo("Apartamento 4 suítes, 2 por andar", TipoImovel.APARTAMENTO, Finalidade.VENDA, 3100000, 180, 4, 4, 3, "Brasília", "Sudoeste", "SQSW 300", -15.7980, -47.9250, false),
                new Modelo("Galpão logístico com doca", TipoImovel.GALPAO, Finalidade.ALUGUEL, 25000, 1200, 0, 0, 10, "Brasília", "SIA", "SIA Trecho 3", -15.8030, -47.9550, false),
                new Modelo("Casa sobrado 3 quartos, quintal amplo", TipoImovel.CASA, Finalidade.ALUGUEL, 4800, 160, 3, 1, 2, "Vicente Pires", "Vicente Pires", "Rua 4C", -15.8030, -48.0230, false));

        int n = 0;
        for (Modelo m : modelos) {
            Imovel i = new Imovel();
            i.setTitulo(m.titulo());
            i.setDescricao("Imóvel de exemplo criado automaticamente para demonstração. " + m.titulo()
                    + ", com " + m.area() + " m² e excelente localização em " + m.bairro() + ", " + m.cidade()
                    + ". Agende uma visita e conheça todos os detalhes.");
            i.setTipo(m.tipo());
            i.setFinalidade(m.fin());
            i.setPreco(BigDecimal.valueOf(m.preco()));
            i.setAreaUtil(BigDecimal.valueOf(m.area()));
            i.setAreaTotal(BigDecimal.valueOf(m.area()));
            i.setQuartos(m.q());
            i.setSuites(m.s());
            i.setBanheiros(Math.max(1, m.s() + 1));
            i.setVagas(m.v());
            i.setUf("DF");
            i.setCidade(m.cidade());
            i.setBairro(m.bairro());
            i.setEndereco(m.endereco());
            i.setLatitude(BigDecimal.valueOf(m.lat()));
            i.setLongitude(BigDecimal.valueOf(m.lng()));
            i.setLancamento(m.lanc());
            i.setDestaque(n % 3 == 0);
            i.setAceitaFinanciamento(m.fin() == Finalidade.VENDA);
            i.setAceitaFgts(m.fin() == Finalidade.VENDA && n % 2 == 0);
            i.setAceitaPermuta(n % 4 == 1);
            i.setEscrituraRegistrada(m.fin() == Finalidade.VENDA && !m.lanc());
            i.setQuitado(n % 3 != 2);
            if (m.fin() == Finalidade.VENDA && m.tipo() == TipoImovel.APARTAMENTO) {
                i.setCondominio(BigDecimal.valueOf(650));
                i.setIptu(BigDecimal.valueOf(1800));
            }
            i.setCaracteristicas(new LinkedHashSet<>(List.of("Área de serviço", "Armários embutidos",
                    n % 2 == 0 ? "Piscina" : "Varanda", n % 3 == 0 ? "Churrasqueira" : "Portaria 24h")));
            i.setStatus(StatusAnuncio.ATIVO);
            i.setFotos(new java.util.ArrayList<>(fotosMock(n)));
            i.setAnuncianteId(n % 2 == 0 ? corretor.getId() : corretor2.getId());
            i.setVisualizacoes(20L + n * 7L);
            imoveis.save(i);
            n++;
        }
        log.info("Dados de demonstração criados: {} anúncios", n);
    }

    /** Fotos de teste servidas pelo front em /mock/fotos (frontend/public/mock/fotos). */
    static List<FotoImovel> fotosMock(int n) {
        // as fotos de teste são renders; a 2ª de cada anúncio fica marcada como "editada com IA" para demonstrar o selo
        int[] passos = {0, 1, 3, 5};
        List<FotoImovel> lista = new java.util.ArrayList<>();
        for (int k = 0; k < passos.length; k++) {
            lista.add(new FotoImovel("/mock/fotos/foto-" + (((n + passos[k]) % 9) + 1) + ".jpg", k == 1));
        }
        return lista;
    }

    /** Em dev, anúncios sem nenhuma foto recebem as fotos de teste (só para visualizar). */
    private void preencherFotosDeTeste() {
        int total = 0;
        for (Imovel i : imoveis.findAll()) {
            if (i.getFotos().isEmpty()) {
                i.getFotos().addAll(fotosMock((int) (i.getId() - 1)));
                imoveis.save(i);
                total++;
            }
        }
        if (total > 0) {
            log.info("Fotos de teste adicionadas a {} anúncios sem foto", total);
        }
    }

    private Usuario usuario(String nome, String email, String senha, EnumSet<Perfil> papeis, String creci) {
        Usuario u = new Usuario();
        u.setNome(nome);
        u.setEmail(email.trim().toLowerCase());
        u.setSenhaHash(encoder.encode(senha));
        u.setPapeis(papeis);
        u.setCreci(creci);
        u.setTelefone("(61) 90000-0000");
        return usuarios.save(u);
    }
}
