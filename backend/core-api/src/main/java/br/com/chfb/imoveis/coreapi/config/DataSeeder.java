package br.com.chfb.imoveis.coreapi.config;

import java.math.BigDecimal;
import java.util.ArrayList;
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
import br.com.chfb.imoveis.listing.entity.OrigemFoto;
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

        List<Modelo> fixos = List.of(
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

        List<Modelo> modelos = new ArrayList<>(fixos);
        modelos.addAll(gerarModelos(TOTAL_DEMONSTRACAO - fixos.size()));

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
            i.setDestaque(n % 9 == 0);
            i.setAceitaFinanciamento(m.fin() == Finalidade.VENDA);
            i.setAceitaFgts(m.fin() == Finalidade.VENDA && n % 2 == 0);
            i.setAceitaPermuta(n % 4 == 1);
            i.setEscrituraRegistrada(m.fin() == Finalidade.VENDA && !m.lanc());
            i.setQuitado(n % 3 != 2);
            if (m.fin() == Finalidade.VENDA && m.tipo() == TipoImovel.APARTAMENTO) {
                i.setCondominio(BigDecimal.valueOf(650));
                i.setIptu(BigDecimal.valueOf(1800));
            }
            i.setCaracteristicas(new LinkedHashSet<>(caracteristicas(m.tipo(), n)));
            i.setStatus(StatusAnuncio.ATIVO);
            i.setFotos(new java.util.ArrayList<>(fotosMock(n)));
            i.setAnuncianteId(n % 2 == 0 ? corretor.getId() : corretor2.getId());
            i.setCondominio(m.condominio() > 0 ? BigDecimal.valueOf(m.condominio()) : i.getCondominio());
            i.setIptu(m.iptu() > 0 ? BigDecimal.valueOf(m.iptu()) : i.getIptu());
            i.setVisualizacoes(20L + n * 7L);
            imoveis.save(i);
            n++;
        }
        log.info("Dados de demonstração criados: {} anúncios", n);
    }

    /** Quantos anúncios de demonstração existem ao todo (os 16 fixos acima + gerados). */
    private static final int TOTAL_DEMONSTRACAO = 300;

    private record Modelo(String titulo, TipoImovel tipo, Finalidade fin, int preco, int area, int q, int s, int v,
            String cidade, String bairro, String endereco, double lat, double lng, boolean lanc, int condominio, int iptu) {

        Modelo(String titulo, TipoImovel tipo, Finalidade fin, int preco, int area, int q, int s, int v, String cidade,
                String bairro, String endereco, double lat, double lng, boolean lanc) {
            this(titulo, tipo, fin, preco, area, q, s, v, cidade, bairro, endereco, lat, lng, lanc, 0, 0);
        }
    }

    /** Região do DF: preço do m² (venda) e o centro aproximado para o mapa. */
    private record Local(String cidade, String bairro, String endereco, double lat, double lng, int m2) {
    }

    private static final List<Local> LOCAIS = List.of(
            new Local("Brasília", "Asa Norte", "SQN 210", -15.7690, -47.8830, 12500),
            new Local("Brasília", "Asa Sul", "SQS 108", -15.8110, -47.8950, 13500),
            new Local("Brasília", "Noroeste", "SQNW 108", -15.7570, -47.9150, 16000),
            new Local("Brasília", "Sudoeste", "SQSW 304", -15.7980, -47.9260, 13000),
            new Local("Brasília", "Lago Sul", "SHIS QI 11", -15.8380, -47.8650, 11000),
            new Local("Brasília", "Lago Norte", "SHIN QI 9", -15.7300, -47.8500, 9500),
            new Local("Brasília", "Park Sul", "Quadra 1 Park Sul", -15.8250, -47.9480, 10500),
            new Local("Águas Claras", "Norte", "Rua 25 Norte", -15.8330, -48.0250, 8800),
            new Local("Águas Claras", "Sul", "Rua 12 Sul", -15.8420, -48.0300, 8500),
            new Local("Taguatinga", "Taguatinga Norte", "QNB 3", -15.8220, -48.0550, 6200),
            new Local("Taguatinga", "Taguatinga Sul", "QSD 15", -15.8450, -48.0600, 5900),
            new Local("Guará", "Guará I", "QE 15", -15.8200, -47.9800, 7800),
            new Local("Guará", "Guará II", "QE 38", -15.8330, -47.9850, 7600),
            new Local("Vicente Pires", "Vicente Pires", "Rua 8", -15.8030, -48.0280, 5200),
            new Local("Sobradinho", "Sobradinho", "Quadra 8", -15.6530, -47.7900, 4800),
            new Local("Sobradinho", "Grande Colorado", "Condomínio Mansões Colorado", -15.6600, -47.8350, 4500),
            new Local("Jardim Botânico", "Jardim Botânico", "Condomínio Ville de Montagne", -15.8650, -47.8000, 5600),
            new Local("Samambaia", "Samambaia Sul", "QR 302", -15.8780, -48.0850, 3900),
            new Local("Ceilândia", "Ceilândia Norte", "QNN 14", -15.8130, -48.1050, 3700),
            new Local("Gama", "Setor Leste", "Quadra 12", -16.0170, -48.0560, 3800),
            new Local("Cruzeiro", "Cruzeiro Novo", "Quadra 1207", -15.7920, -47.9370, 8200),
            new Local("Núcleo Bandeirante", "Núcleo Bandeirante", "3ª Avenida", -15.8700, -47.9690, 6000),
            new Local("Riacho Fundo", "Riacho Fundo I", "QN 5", -15.8810, -48.0150, 4300),
            new Local("Planaltina", "Setor Tradicional", "Quadra 6", -15.6170, -47.6520, 3300));

    private static final String[] ADJ_APARTAMENTO = {"reformado", "nascente", "com vista livre", "andar alto",
            "perto do metrô", "pronto para morar", "mobiliado", "com lazer completo", "iluminado", "amplo"};
    private static final String[] ADJ_CASA = {"com quintal", "com piscina", "térrea", "reformada", "com área gourmet",
            "pronta para morar", "em rua tranquila", "com edícula", "ampla", "bem localizada"};

    /** Gera anúncios variados e coerentes (área, quartos e preço conforme o tipo e a região). Determinístico. */
    private static List<Modelo> gerarModelos(int quantidade) {
        java.util.Random r = new java.util.Random(20261115L);
        TipoImovel[] tipos = {TipoImovel.APARTAMENTO, TipoImovel.APARTAMENTO, TipoImovel.APARTAMENTO, TipoImovel.CASA,
                TipoImovel.CASA, TipoImovel.CASA_CONDOMINIO, TipoImovel.COBERTURA, TipoImovel.KITNET, TipoImovel.FLAT,
                TipoImovel.LOTE, TipoImovel.SALA, TipoImovel.SALA, TipoImovel.LOJA, TipoImovel.GALPAO, TipoImovel.PREDIO,
                TipoImovel.CHACARA};
        List<Modelo> lista = new ArrayList<>(quantidade);
        for (int k = 0; k < quantidade; k++) {
            TipoImovel tipo = tipos[r.nextInt(tipos.length)];
            Local l = LOCAIS.get(r.nextInt(LOCAIS.size()));
            int sorteio = r.nextInt(100);
            boolean temporada = (tipo == TipoImovel.FLAT || tipo == TipoImovel.KITNET || tipo == TipoImovel.APARTAMENTO) && sorteio < 8;
            Finalidade fin = temporada ? Finalidade.TEMPORADA
                    : (tipo == TipoImovel.LOTE || tipo == TipoImovel.CHACARA || tipo == TipoImovel.PREDIO) ? Finalidade.VENDA
                    : sorteio < 62 ? Finalidade.VENDA : Finalidade.ALUGUEL;

            int area, q, s, v;
            switch (tipo) {
                case KITNET, FLAT -> { area = 26 + r.nextInt(25); q = 1; s = r.nextInt(2); v = r.nextInt(2); }
                case APARTAMENTO -> { q = 1 + r.nextInt(4); area = 35 + q * 22 + r.nextInt(30); s = Math.min(q, r.nextInt(q + 1)); v = 1 + r.nextInt(2); }
                case COBERTURA -> { q = 3 + r.nextInt(2); area = 160 + r.nextInt(180); s = q; v = 2 + r.nextInt(3); }
                case CASA -> { q = 2 + r.nextInt(4); area = 90 + q * 35 + r.nextInt(120); s = r.nextInt(q); v = 1 + r.nextInt(4); }
                case CASA_CONDOMINIO -> { q = 3 + r.nextInt(3); area = 180 + r.nextInt(250); s = 1 + r.nextInt(q); v = 2 + r.nextInt(3); }
                case LOTE -> { area = 300 + r.nextInt(1700); q = 0; s = 0; v = 0; }
                case SALA -> { area = 25 + r.nextInt(120); q = 0; s = 0; v = r.nextInt(3); }
                case LOJA -> { area = 40 + r.nextInt(260); q = 0; s = 0; v = r.nextInt(4); }
                case GALPAO -> { area = 400 + r.nextInt(2600); q = 0; s = 0; v = 4 + r.nextInt(12); }
                case PREDIO -> { area = 600 + r.nextInt(2400); q = 0; s = 0; v = 8 + r.nextInt(20); }
                default -> { area = 5000 + r.nextInt(40000); q = 2 + r.nextInt(3); s = 1; v = 4 + r.nextInt(6); }
            }

            double fator = switch (tipo) {
                case LOTE -> 0.22;
                case CHACARA -> 0.012;
                case GALPAO, PREDIO -> 0.45;
                case CASA, CASA_CONDOMINIO -> 0.75;
                case COBERTURA -> 1.1;
                default -> 1.0;
            };
            double vendaBase = l.m2() * fator * area * (0.85 + r.nextDouble() * 0.3);
            int preco = switch (fin) {
                case VENDA -> (int) (Math.round(vendaBase / 5000.0) * 5000);
                case ALUGUEL -> (int) (Math.round(vendaBase * 0.0045 / 50.0) * 50);
                case TEMPORADA -> 180 + r.nextInt(16) * 20;
            };
            preco = Math.max(preco, fin == Finalidade.VENDA ? 90000 : fin == Finalidade.ALUGUEL ? 700 : 150);

            boolean residencial = q > 0 && tipo != TipoImovel.CHACARA;
            boolean lanc = fin == Finalidade.VENDA && (tipo == TipoImovel.APARTAMENTO || tipo == TipoImovel.COBERTURA) && r.nextInt(10) == 0;
            int condominio = (tipo == TipoImovel.APARTAMENTO || tipo == TipoImovel.COBERTURA || tipo == TipoImovel.CASA_CONDOMINIO
                    || tipo == TipoImovel.SALA || tipo == TipoImovel.FLAT || tipo == TipoImovel.KITNET) ? (int) (area * (5 + r.nextInt(6))) : 0;
            int iptu = fin == Finalidade.VENDA && tipo != TipoImovel.CHACARA ? (int) (vendaBase * 0.003) : 0;

            String titulo;
            String[] adjetivos = tipo == TipoImovel.CASA || tipo == TipoImovel.CASA_CONDOMINIO ? ADJ_CASA : ADJ_APARTAMENTO;
            String adj = adjetivos[r.nextInt(adjetivos.length)];
            if (lanc) {
                titulo = "Lançamento: " + tipo.getDescricao().toLowerCase() + " de " + q + (q == 1 ? " quarto" : " quartos") + " em " + l.bairro();
            } else if (residencial) {
                titulo = tipo.getDescricao() + " " + q + (q == 1 ? " quarto" : " quartos") + (s > 0 ? " (" + s + (s == 1 ? " suíte)" : " suítes)") : "")
                        + ", " + adj;
            } else {
                titulo = tipo.getDescricao() + " com " + area + " m² em " + l.bairro();
            }
            String endereco = l.endereco() + (tipo == TipoImovel.LOTE || tipo == TipoImovel.CHACARA ? "" : " Bloco " + (char) ('A' + r.nextInt(8)));
            double lat = l.lat() + (r.nextDouble() - 0.5) * 0.02;
            double lng = l.lng() + (r.nextDouble() - 0.5) * 0.02;
            lista.add(new Modelo(titulo, tipo, fin, preco, area, q, s, v, l.cidade(), l.bairro(), endereco, lat, lng, lanc,
                    condominio, iptu));
        }
        return lista;
    }

    private static List<String> caracteristicas(TipoImovel tipo, int n) {
        List<String> base = switch (tipo) {
            case LOTE -> List.of("Plano", "Escriturado", "Rua asfaltada", "Água e luz no local");
            case SALA, LOJA, PREDIO -> List.of("Ar-condicionado", "Elevador", "Copa", "Portaria 24h", "Recepção");
            case GALPAO -> List.of("Doca", "Pé-direito alto", "Pátio de manobra", "Escritório");
            case CHACARA -> List.of("Pomar", "Poço artesiano", "Casa sede", "Curral", "Lago");
            default -> List.of("Área de serviço", "Armários embutidos", "Varanda", "Piscina", "Churrasqueira", "Portaria 24h",
                    "Academia", "Salão de festas", "Playground", "Elevador");
        };
        List<String> r = new ArrayList<>();
        for (int k = 0; k < base.size(); k++) {
            if ((n + k) % 3 != 0) {
                r.add(base.get(k));
            }
        }
        return r.isEmpty() ? List.of(base.get(0)) : r;
    }

    /** Fotos de teste servidas pelo front em /mock/fotos (frontend/public/mock/fotos). */
    static List<FotoImovel> fotosMock(int n) {
        // fotos de teste: a 1ª fica como "foto real", a 2ª como "IA" e as demais "não informado", para demonstrar os três estados
        int[] passos = {0, 1, 3, 5};
        List<FotoImovel> lista = new java.util.ArrayList<>();
        for (int k = 0; k < passos.length; k++) {
            OrigemFoto origem = k == 0 ? OrigemFoto.REAL : k == 1 ? OrigemFoto.IA : OrigemFoto.NAO_INFORMADO;
            lista.add(new FotoImovel("/mock/fotos/foto-" + (((n + passos[k]) % 9) + 1) + ".jpg", origem));
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
        u.setTelefone("61900000000");
        return usuarios.save(u);
    }
}
