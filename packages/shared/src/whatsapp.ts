/**
 * Utilidades para el link de WhatsApp (https://wa.me/<numero>?text=<mensaje>).
 *
 * Formato del número en Argentina para celulares:
 *   54 (país) + 9 (celular) + código de área SIN el 0 + número SIN el 15
 *   Ej: 011 15 1234-5678  ->  5491112345678  (13 dígitos)
 *
 * El comercio carga su número en el panel; lo guardamos ya normalizado.
 */

/** Deja solo los dígitos: "+54 9 11 1234-5678" -> "5491112345678" */
export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

const REGEX_CELULAR_AR = /^549\d{10}$/;

export function esNumeroWhatsappValido(numero: string): boolean {
  return REGEX_CELULAR_AR.test(soloDigitos(numero));
}

/**
 * Normaliza un número ingresado por el comercio.
 * Acepta con o sin "+", espacios y guiones. Devuelve null si no tiene el formato 549XXXXXXXXXX.
 * (No intenta "adivinar" el 15 ni el 0 del área: preferimos rechazar y pedir el formato correcto.)
 */
export function normalizarNumeroWhatsapp(valor: string): string | null {
  const digitos = soloDigitos(valor);
  return REGEX_CELULAR_AR.test(digitos) ? digitos : null;
}

export function construirLinkWhatsapp(numero: string, mensaje: string): string {
  const normalizado = normalizarNumeroWhatsapp(numero);
  if (!normalizado) {
    throw new Error(`Número de WhatsApp inválido: "${numero}". Formato esperado: 549XXXXXXXXXX`);
  }
  return `https://wa.me/${normalizado}?text=${encodeURIComponent(mensaje)}`;
}
