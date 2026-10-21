const STORAGE_KEY_PB_URL = 'testify_pocketbase_url';
const STORAGE_KEY_PB_TOKEN = 'testify_pocketbase_token';

/**
 * Resolves the active PocketBase server URL (from localStorage, env, or legacy config).
 */
export function getPocketBaseUrl(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PB_URL);
    if (stored && stored.trim()) return cleanUrl(stored);

    // Check legacy homelab config
    const legacyRaw = localStorage.getItem('testify_database_target_config');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed.homelabUrl && parsed.homelabUrl.trim()) {
        return cleanUrl(parsed.homelabUrl);
      }
    }

    const envUrl = (import.meta.env.VITE_POCKETBASE_URL || '').trim();
    if (envUrl) return cleanUrl(envUrl);
  } catch {}
  return '';
}

export function setPocketBaseUrl(url: string): void {
  const cleaned = cleanUrl(url);
  try {
    if (cleaned) {
      localStorage.setItem(STORAGE_KEY_PB_URL, cleaned);
    } else {
      localStorage.removeItem(STORAGE_KEY_PB_URL);
    }
  } catch {}
}

export function getPocketBaseToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_PB_TOKEN);
  } catch {
    return null;
  }
}

export function setPocketBaseToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(STORAGE_KEY_PB_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_KEY_PB_TOKEN);
    }
  } catch {}
}

export function isPocketBaseConfigured(): boolean {
  const url = getPocketBaseUrl();
  return Boolean(url && (url.startsWith('https://') || url.startsWith('http://')));
}

function cleanUrl(raw: string): string {
  let cleaned = (raw || '').trim().replace(/\/$/, '');
  if (!cleaned) return '';
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

/**
 * Tests connection to a PocketBase server instance.
 */
export async function testPocketBase(
  customUrl?: string
): Promise<{ ok: boolean; message: string; latencyMs?: number; status?: number }> {
  const url = customUrl ? cleanUrl(customUrl) : getPocketBaseUrl();

  if (!url) {
    return {
      ok: false,
      message: 'Introduce la URL de tu túnel Cloudflare o servidor PocketBase.',
    };
  }

  const start = Date.now();

  // Try direct browser fetch first
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
    });
    clearTimeout(timer);

    const latencyMs = Date.now() - start;

    if (res.ok || res.status === 200 || res.status === 404) {
      return {
        ok: true,
        message: `¡PocketBase en línea y respondiendo! (${latencyMs}ms)`,
        latencyMs,
        status: res.status,
      };
    } else if (res.status === 502) {
      return {
        ok: false,
        status: 502,
        message: 'Error 502 Bad Gateway: El túnel está activo, pero PocketBase no está ejecutándose en tu Mac.',
      };
    } else {
      return {
        ok: false,
        status: res.status,
        message: `PocketBase respondió con código HTTP ${res.status}`,
      };
    }
  } catch (err: any) {
    // Try backend proxy if browser direct fetch is blocked by CORS/Mixed Content
    try {
      const proxyRes = await fetch('/api/homelab/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: url }),
      });
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (data.ok) {
          return {
            ok: true,
            message: `¡PocketBase en línea y respondiendo! (${data.latencyMs}ms)`,
            latencyMs: data.latencyMs,
            status: data.status,
          };
        }
        return {
          ok: false,
          status: data.status,
          message: data.error || 'No se pudo contactar con PocketBase.',
        };
      }
    } catch {}

    return {
      ok: false,
      message:
        err.name === 'AbortError'
          ? 'Tiempo de espera agotado (7s). Verifica que tu Mac esté encendido y el túnel activo.'
          : `Error de conexión: ${err.message}`,
    };
  }
}
