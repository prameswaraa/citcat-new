const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export interface AIConfig {
  enabled: boolean;
  model: string;
  systemPrompt: string;
  temperature: number;
  filterWords?: string[];
  activeAgentId?: string;
}

export interface AIAgent {
  id: string;
  name: string;
  systemPrompt: string;
  knowledgeDocumentCount?: number;
  knowledgeDocuments?: KnowledgeDocument[];
  assignedPhoneNumberIds?: string[];
}

export interface KnowledgeDocument {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  _count?: {
    chunks: number;
  };
}

export const aiApi = {
  async getConfig(whatsappAccountId?: string): Promise<{ data: AIConfig; isCustomized?: boolean }> {
    const params = whatsappAccountId ? `?whatsappAccountId=${whatsappAccountId}` : '';
    const response = await fetch(`${API_URL}/api/v1/ai/config${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch AI config');
    }

    const json = await response.json();
    return { data: json.data || json, isCustomized: json.isCustomized };
  },

  async updateConfig(data: Partial<AIConfig>, whatsappAccountId?: string) {
    const params = whatsappAccountId ? `?whatsappAccountId=${whatsappAccountId}` : '';
    const response = await fetch(`${API_URL}/api/v1/ai/config${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to update AI config');
    }

    const json = await response.json();
    return json.data || json;
  },

  async deleteAccountConfig(whatsappAccountId: string) {
    const response = await fetch(`${API_URL}/api/v1/ai/config?whatsappAccountId=${whatsappAccountId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to reset config');
    }

    return response.json();
  },

  async getDocuments() {
    const response = await fetch(`${API_URL}/api/v1/ai/knowledge`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch documents');
    }

    const json = await response.json();
    return json.data || json;
  },

  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/api/v1/ai/knowledge/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to upload document');
    }

    return response.json();
  },

  async deleteDocument(id: string) {
    const response = await fetch(`${API_URL}/api/v1/ai/knowledge/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to delete document');
    }

    return response.json();
  },

  async getAgents() {
    const response = await fetch(`${API_URL}/api/v1/ai/agents`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch agents');
    }

    const json = await response.json();
    return json.data || json;
  },

  async getAgent(id: string) {
    const response = await fetch(`${API_URL}/api/v1/ai/agents/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch agent');
    }

    const json = await response.json();
    return json.data || json;
  },

  async createAgent(data: { name: string; systemPrompt: string; documentIds: string[]; assignedPhoneNumberIds?: string[] }) {
    const response = await fetch(`${API_URL}/api/v1/ai/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to create agent');
    }

    const json = await response.json();
    return json.data || json;
  },

  async updateAgent(id: string, data: { name: string; systemPrompt: string; documentIds: string[]; assignedPhoneNumberIds?: string[] }) {
    const response = await fetch(`${API_URL}/api/v1/ai/agents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to update agent');
    }

    const json = await response.json();
    return json.data || json;
  },

  async deleteAgent(id: string) {
    const response = await fetch(`${API_URL}/api/v1/ai/agents/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to delete agent');
    }

    return true;
  },

  async testChat(message: string, agentId: string): Promise<{ response: string; isError: boolean }> {
    const response = await fetch(`${API_URL}/api/v1/ai/test-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ message, agentId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to send message');
    }

    const json = await response.json();
    return json.data;
  },

  async getModels(): Promise<{ models: Array<{ id: string; owned_by: string }> }> {
    const response = await fetch(`${API_URL}/api/v1/ai/models`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch models');
    }

    const json = await response.json();
    return json.data || { models: [] };
  },

  async getMemoryCount(whatsappAccountId: string): Promise<{ count: number }> {
    const response = await fetch(`${API_URL}/api/v1/ai/memory/count?whatsappAccountId=${whatsappAccountId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch memory count');
    }

    const json = await response.json();
    return json.data;
  },

  async deleteMemory(whatsappAccountId: string): Promise<{ deletedCount: number }> {
    const response = await fetch(`${API_URL}/api/v1/ai/memory?whatsappAccountId=${whatsappAccountId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to delete memory');
    }

    const json = await response.json();
    return json.data;
  },

  async getCustomersWithMemory(
    whatsappAccountId: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ): Promise<{
    customers: {
      customerId: string;
      customerName: string | null;
      customerPhone: string | null;
      memoryCount: number;
      lastMemoryAt: string;
    }[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams({ whatsappAccountId });
    if (options.page) params.set('page', options.page.toString());
    if (options.limit) params.set('limit', options.limit.toString());
    if (options.search) params.set('search', options.search);

    const response = await fetch(`${API_URL}/api/v1/ai/memory/customers?${params}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to fetch customers');
    }

    const json = await response.json();
    return json.data;
  },

  async deleteCustomerMemory(whatsappAccountId: string, customerId: string): Promise<{ deletedCount: number }> {
    const response = await fetch(`${API_URL}/api/v1/ai/memory/customer?whatsappAccountId=${whatsappAccountId}&customerId=${customerId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || 'Failed to delete customer memory');
    }

    const json = await response.json();
    return json.data;
  },
};