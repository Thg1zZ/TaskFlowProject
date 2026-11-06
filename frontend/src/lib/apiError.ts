import axios from "axios";

/**
 * Extrai a mensagem do formato de erro do backend: { status, error, details }.
 * Erros de validação trazem o motivo por campo em "details"; o primeiro é o mais útil.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { error?: string; details?: Record<string, string> | null } | undefined;
  const firstDetail = data?.details ? Object.values(data.details)[0] : undefined;
  return firstDetail || data?.error || fallback;
}
