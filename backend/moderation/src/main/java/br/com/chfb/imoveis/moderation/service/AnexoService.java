package br.com.chfb.imoveis.moderation.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import br.com.chfb.imoveis.moderation.entity.AnexoDenuncia;
import br.com.chfb.imoveis.moderation.repository.AnexoDenunciaRepository;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;
import br.com.chfb.imoveis.sharedkernel.exception.ForbiddenException;
import br.com.chfb.imoveis.sharedkernel.exception.NotFoundException;
import br.com.chfb.imoveis.sharedkernel.security.AuthUser;
import br.com.chfb.imoveis.sharedkernel.security.Perfil;

/**
 * Anexos das pendências: <b>somente imagens (JPG, PNG, WEBP) e PDF</b>. O tipo é conferido pelo tipo declarado,
 * pela extensão do nome e pela assinatura do conteúdo (zip, vídeo, executável etc. são recusados mesmo
 * renomeados). Os arquivos ficam fora da pasta pública e só são entregues a quem tem acesso à denúncia.
 */
@Service
public class AnexoService {

    /** URL de um anexo (nome gerado pelo sistema). */
    public static final Pattern URL = Pattern.compile("^/app/denuncias/anexos/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp|pdf))$");
    private static final Pattern NOME = Pattern.compile("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(?:jpg|png|webp|pdf)$");

    private static final Map<String, String> TIPOS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "application/pdf", "pdf");

    private static final Map<String, List<String>> EXTENSOES_DO_NOME = Map.of(
            "jpg", List.of("jpg", "jpeg"), "png", List.of("png"), "webp", List.of("webp"), "pdf", List.of("pdf"));

    private static final long MAX_BYTES = 5L * 1024 * 1024;

    private final Path dir;
    private final AnexoDenunciaRepository anexos;

    public AnexoService(@Value("${app.uploads.dir}") String uploads, AnexoDenunciaRepository anexos) {
        this.dir = Path.of(uploads, "anexos-denuncias").toAbsolutePath().normalize();
        this.anexos = anexos;
    }

    @Transactional
    public String salvar(MultipartFile arquivo, AuthUser u) {
        if (u.perfil() != Perfil.CORRETOR && u.perfil() != Perfil.ADMIN) {
            throw new ForbiddenException("Só o anunciante e a moderação enviam anexos");
        }
        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessException("Envie um arquivo");
        }
        if (arquivo.getSize() > MAX_BYTES) {
            throw new BusinessException(413, "O anexo pode ter no máximo 5 MB");
        }
        String tipo = arquivo.getContentType() == null ? "" : arquivo.getContentType().toLowerCase(Locale.ROOT);
        String ext = TIPOS.get(tipo);
        String original = arquivo.getOriginalFilename() == null ? "" : arquivo.getOriginalFilename();
        String extNome = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        if (ext == null || !EXTENSOES_DO_NOME.get(ext).contains(extNome)) {
            throw new BusinessException(415, "Só são aceitas imagens (JPG, PNG, WEBP) e PDF");
        }
        try (InputStream in = arquivo.getInputStream()) {
            if (!assinaturaValida(in.readNBytes(12), ext)) {
                throw new BusinessException(415, "O conteúdo do arquivo não é uma imagem ou PDF válido");
            }
        } catch (IOException e) {
            throw new BusinessException("Não foi possível ler o arquivo");
        }
        String nome = UUID.randomUUID() + "." + ext;
        try {
            Files.createDirectories(dir);
            Path destino = dir.resolve(nome).normalize();
            try (InputStream in = arquivo.getInputStream()) {
                Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new BusinessException(500, "Falha ao gravar o anexo");
        }
        AnexoDenuncia a = new AnexoDenuncia();
        a.setNome(nome);
        a.setUsuarioId(u.id());
        a.setTipo(tipo);
        a.setTamanho(arquivo.getSize());
        a.setOriginal(original.length() > 200 ? original.substring(0, 200) : original);
        anexos.save(a);
        return "/app/denuncias/anexos/" + nome;
    }

    /** Arquivo de um anexo, se o usuário pode vê-lo (administrador, quem enviou ou o anunciante da denúncia). */
    @Transactional(readOnly = true)
    public Arquivo abrir(String nome, AuthUser u) {
        if (!NOME.matcher(nome).matches()) {
            throw new NotFoundException("Anexo não encontrado");
        }
        AnexoDenuncia a = anexos.findById(nome).orElseThrow(() -> new NotFoundException("Anexo não encontrado"));
        boolean pode = u.isAdmin() || a.getUsuarioId().equals(u.id())
                || anexos.visivelParaAnunciante("/app/denuncias/anexos/" + nome, u.id());
        if (!pode) {
            throw new ForbiddenException("Sem acesso a este anexo");
        }
        Path p = dir.resolve(nome).normalize();
        if (!p.startsWith(dir) || !Files.isRegularFile(p)) {
            throw new NotFoundException("Anexo não encontrado");
        }
        return new Arquivo(p, a.getTipo(), a.getOriginal());
    }

    /**
     * Confere os anexos de uma mensagem: cada um precisa ser uma URL de anexo do sistema enviada pelo próprio autor.
     *
     * @return as URLs, uma por linha (ou nulo)
     */
    @Transactional(readOnly = true)
    public String validar(List<String> urls, Long autorId) {
        if (urls == null || urls.isEmpty()) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        for (String url : urls) {
            Matcher m = URL.matcher(url == null ? "" : url.strip());
            if (!m.matches()) {
                throw new BusinessException("Anexo inválido");
            }
            AnexoDenuncia a = anexos.findById(m.group(1)).orElseThrow(() -> new BusinessException("Anexo não encontrado"));
            if (!a.getUsuarioId().equals(autorId)) {
                throw new BusinessException("Anexo de outro usuário");
            }
            if (sb.length() > 0) {
                sb.append('\n');
            }
            sb.append(url.strip());
        }
        return sb.toString();
    }

    public record Arquivo(Path caminho, String tipo, String nomeOriginal) {
    }

    private static boolean assinaturaValida(byte[] b, String ext) {
        if (b.length < 5) {
            return false;
        }
        return switch (ext) {
            case "jpg" -> (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
            case "png" -> (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
            case "webp" -> b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W'
                    && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
            case "pdf" -> b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-';
            default -> false;
        };
    }
}
