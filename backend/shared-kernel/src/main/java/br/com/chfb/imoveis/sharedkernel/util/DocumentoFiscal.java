package br.com.chfb.imoveis.sharedkernel.util;

/**
 * Validação de CPF e CNPJ pelos dígitos verificadores (mesma regra do front em
 * {@code core/pipes/documentos.ts}). Aceita o valor com ou sem pontuação.
 */
public final class DocumentoFiscal {

    private DocumentoFiscal() {
    }

    /** CPF válido: 11 dígitos, não todos iguais, e os dois dígitos verificadores conferem. */
    public static boolean cpfValido(String valor) {
        String d = Digitos.somente(valor);
        if (d == null || d.length() != 11 || d.chars().distinct().count() == 1) {
            return false;
        }
        return dvCpf(d, 9) == d.charAt(9) - '0' && dvCpf(d, 10) == d.charAt(10) - '0';
    }

    /** CNPJ válido: 14 dígitos, não todos iguais, e os dois dígitos verificadores conferem. */
    public static boolean cnpjValido(String valor) {
        String d = Digitos.somente(valor);
        if (d == null || d.length() != 14 || d.chars().distinct().count() == 1) {
            return false;
        }
        return dvCnpj(d, 12) == d.charAt(12) - '0' && dvCnpj(d, 13) == d.charAt(13) - '0';
    }

    private static int dvCpf(String d, int tamanho) {
        int soma = 0;
        for (int i = 0; i < tamanho; i++) {
            soma += (d.charAt(i) - '0') * (tamanho + 1 - i);
        }
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    private static int dvCnpj(String d, int tamanho) {
        int soma = 0;
        int peso = tamanho - 7; // 5 para o 1º dígito, 6 para o 2º; volta a 9 depois do 2
        for (int i = 0; i < tamanho; i++) {
            soma += (d.charAt(i) - '0') * peso;
            peso = peso == 2 ? 9 : peso - 1;
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}
