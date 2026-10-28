import { User, PurchaseRequest, AppVersionRelease, VersionReviewer } from '../types';

const API_BASE = '/api';

export const api = {
  // Verificação de saúde e conexão com PostgreSQL
  async checkHealth(): Promise<{ status: string; database: 'connected' | 'disconnected' }> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) return { status: 'error', database: 'disconnected' };
      return await res.json();
    } catch {
      return { status: 'offline', database: 'disconnected' };
    }
  },

  // Usuários
  async getUsers(): Promise<User[] | null> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveUser(user: User): Promise<User | null> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Solicitações de Compra
  async getRequests(): Promise<PurchaseRequest[] | null> {
    try {
      const res = await fetch(`${API_BASE}/requests`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async createRequest(request: PurchaseRequest): Promise<PurchaseRequest | null> {
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateRequest(request: PurchaseRequest): Promise<PurchaseRequest | null> {
    try {
      const res = await fetch(`${API_BASE}/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteRequest(requestId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/requests/${requestId}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async clearAllRequests(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/requests`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Versões e Revisores
  async getVersions(): Promise<AppVersionRelease[] | null> {
    try {
      const res = await fetch(`${API_BASE}/versions`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveVersion(version: AppVersionRelease): Promise<AppVersionRelease | null> {
    try {
      const res = await fetch(`${API_BASE}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(version),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getReviewers(): Promise<VersionReviewer[] | null> {
    try {
      const res = await fetch(`${API_BASE}/versions/reviewers`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
};
