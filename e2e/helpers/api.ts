export const API_BASE = process.env.PLAYWRIGHT_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';

/** True when the Nest API responds on /health/live (SSR catalog pages need this). */
export async function isApiLive(request: {
  get(url: string): Promise<{ ok(): boolean }>;
}): Promise<boolean> {
  try {
    const response = await request.get(`${API_BASE}/health/live`);
    return response.ok();
  } catch {
    return false;
  }
}
