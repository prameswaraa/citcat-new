const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.citcat.id';

export const authApi = {
  async getMe() {
    const response = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch user profile');
    }

    const json = await response.json();
    return json.data;
  }
};