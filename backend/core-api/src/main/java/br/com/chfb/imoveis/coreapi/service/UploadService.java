package br.com.chfb.imoveis.coreapi.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import br.com.chfb.imoveis.coreapi.config.AppProperties;
import br.com.chfb.imoveis.coreapi.config.WebConfig;
import br.com.chfb.imoveis.sharedkernel.exception.BusinessException;

/** Grava imagens enviadas (fotos de anúncios, logo, favicon) no disco. SVG não é aceito por segurança. */
@Service
public class UploadService {

    private static final Map<String, String> TIPOS = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif",
            "image/x-icon", "ico",
            "image/vnd.microsoft.icon", "ico");

    private final AppProperties props;

    public UploadService(AppProperties props) {
        this.props = props;
    }

    /** Formatos aceitos para foto de perfil. */
    public static final java.util.Set<String> FOTO_PERFIL = java.util.Set.of("jpg", "png", "webp");

    public String salvar(MultipartFile arquivo) {
        return salvar(arquivo, null);
    }

    /**
     * @param extensoesPermitidas restringe os formatos (nulo = todos os aceitos pelo sistema)
     */
    public String salvar(MultipartFile arquivo, java.util.Set<String> extensoesPermitidas) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessException("Envie um arquivo");
        }
        if (arquivo.getSize() > props.uploads().maxBytes().toBytes()) {
            throw new BusinessException(413, "Arquivo maior que o permitido");
        }
        String tipo = arquivo.getContentType() == null ? "" : arquivo.getContentType().toLowerCase(Locale.ROOT);
        String ext = TIPOS.get(tipo);
        if (ext == null || (extensoesPermitidas != null && !extensoesPermitidas.contains(ext))) {
            throw new BusinessException(415, extensoesPermitidas == null ? "Formato não suportado. Use JPG, PNG, WEBP, GIF ou ICO."
                    : "Formato não suportado. Use JPG, PNG ou WEBP.");
        }
        try (InputStream in = arquivo.getInputStream()) {
            if (!assinaturaValida(in.readNBytes(12), ext)) {
                throw new BusinessException(415, "O conteúdo do arquivo não corresponde ao formato informado");
            }
        } catch (IOException e) {
            throw new BusinessException(400, "Não foi possível ler o arquivo");
        }
        String nome = UUID.randomUUID() + "." + ext;
        try {
            Path dir = Path.of(props.uploads().dir()).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path destino = dir.resolve(nome).normalize();
            if (!destino.startsWith(dir)) {
                throw new BusinessException("Nome de arquivo inválido");
            }
            try (InputStream in = arquivo.getInputStream()) {
                Files.copy(in, destino, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new BusinessException(500, "Falha ao gravar o arquivo");
        }
        return WebConfig.UPLOADS_PATH + nome;
    }

    private static boolean assinaturaValida(byte[] b, String ext) {
        if (b.length < 4) {
            return false;
        }
        return switch (ext) {
            case "jpg" -> (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8;
            case "png" -> (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
            case "gif" -> b[0] == 'G' && b[1] == 'I' && b[2] == 'F';
            case "webp" -> b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W'
                    && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
            case "ico" -> b[0] == 0 && b[1] == 0 && b[2] == 1 && b[3] == 0;
            default -> false;
        };
    }
}
