const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  raw_user_meta_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Helper to get session from localStorage
function getSessionSync(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("mock_session");
  return raw ? JSON.parse(raw) : null;
}

// Helper to get authorization headers
function getAuthHeaders(): Record<string, string> {
  const session = getSessionSync();
  if (session && session.access_token) {
    return {
      "Authorization": `Bearer ${session.access_token}`,
    };
  }
  return {};
}

class MockQueryBuilder {
  private table: string;
  private filterParams: Record<string, any> = {};
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;
  private operationPromise: (() => Promise<any>) | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderCol = column;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  eq(column: string, value: any) {
    this.filterParams[column] = value;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  insert(data: any) {
    this.operationPromise = async () => {
      try {
        const res = await fetch(`${API_URL}/api/data/${this.table}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        return json;
      } catch (error: any) {
        console.error(`Error inserting into ${this.table}:`, error);
        return { data: null, error: { message: error.message } };
      }
    };
    return this;
  }

  update(data: any) {
    this.operationPromise = async () => {
      try {
        const queryParams = new URLSearchParams(this.filterParams).toString();
        const res = await fetch(`${API_URL}/api/data/${this.table}?${queryParams}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        return json;
      } catch (error: any) {
        console.error(`Error updating ${this.table}:`, error);
        return { data: null, error: { message: error.message } };
      }
    };
    return this;
  }

  delete() {
    this.operationPromise = async () => {
      try {
        const queryParams = new URLSearchParams(this.filterParams).toString();
        const res = await fetch(`${API_URL}/api/data/${this.table}?${queryParams}`, {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        });
        const json = await res.json();
        return json;
      } catch (error: any) {
        console.error(`Error deleting from ${this.table}:`, error);
        return { data: null, error: { message: error.message } };
      }
    };
    return this;
  }

  then(onfulfilled?: (value: any) => any) {
    if (this.operationPromise) {
      return this.operationPromise().then(onfulfilled);
    }

    const runQuery = async () => {
      try {
        const params = { ...this.filterParams } as any;
        if (this.orderCol) {
          params._order = this.orderCol;
          params._asc = String(this.orderAsc);
        }
        if (this.limitCount) {
          params._limit = String(this.limitCount);
        }
        const queryParams = new URLSearchParams(params).toString();
        const res = await fetch(`${API_URL}/api/data/${this.table}?${queryParams}`, {
          headers: {
            ...getAuthHeaders(),
          },
        });
        const json = await res.json();
        return json;
      } catch (error: any) {
        console.error(`Error fetching from ${this.table}:`, error);
        return { data: [], count: 0, error: { message: error.message } };
      }
    };

    return runQuery().then(onfulfilled);
  }
}

export const authCallbacks: Array<(event: string, session: Session | null) => void> = [];

export const mern = {
  auth: {
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      authCallbacks.push(callback);
      const session = getSessionSync();
      setTimeout(() => {
        callback(session ? "SIGNED_IN" : "SIGNED_OUT", session);
      }, 0);
      return {
        data: {
          subscription: {
            unsubscribe() {
              const idx = authCallbacks.indexOf(callback);
              if (idx !== -1) authCallbacks.splice(idx, 1);
            },
          },
        },
      };
    },

    async getSession() {
      return { data: { session: getSessionSync() }, error: null };
    },

    setSession(token: string) {
      try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const jsonPayload = decodeURIComponent(
          window.atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        const payload = JSON.parse(jsonPayload);
        const session: Session = {
          access_token: token,
          token_type: "bearer",
          expires_in: 604800,
          user: {
            id: payload.id || payload.sub,
            email: payload.email,
            raw_user_meta_data: payload.user_metadata || {},
          },
        };
        localStorage.setItem("mock_session", JSON.stringify(session));
        authCallbacks.forEach((cb) => cb("SIGNED_IN", session));
      } catch (e) {
        console.error("Failed to set session from token:", e);
      }
    },

    async signUp({ email, password, options }: any) {
      try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, options }),
        });
        const json = await res.json();
        if (json.error) {
          return { data: { user: null, session: null }, error: json.error };
        }
        
        const session = json.data.session;
        if (session) {
          localStorage.setItem("mock_session", JSON.stringify(session));
          authCallbacks.forEach((cb) => cb("SIGNED_IN", session));
        }

        return { data: { user: json.data.user, session }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: { message: error.message } };
      }
    },

    async signInWithPassword({ email, password }: any) {
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (json.error) {
          return { data: { session: null, user: null }, error: json.error };
        }

        const session = json.data.session;
        if (session) {
          localStorage.setItem("mock_session", JSON.stringify(session));
          authCallbacks.forEach((cb) => cb("SIGNED_IN", session));
        }

        return { data: { session, user: json.data.user }, error: null };
      } catch (error: any) {
        return { data: { session: null, user: null }, error: { message: error.message } };
      }
    },

    async changePassword({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) {
      try {
        const res = await fetch(`${API_URL}/api/auth/change-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ oldPassword, newPassword }),
        });
        const json = await res.json();
        if (json.error) return { data: null, error: json.error };
        return { data: json.data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    async resetPassword({ email, newPassword }: any) {
      try {
        const res = await fetch(`${API_URL}/api/auth/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, newPassword }),
        });
        const json = await res.json();
        if (json.error) return { data: null, error: json.error };
        return { data: json.data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    async signOut() {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
        });
      } catch (error) {
        console.error("Logout request error:", error);
      }
      localStorage.removeItem("mock_session");
      authCallbacks.forEach((cb) => cb("SIGNED_OUT", null));
      return { error: null };
    },
  },

  from(table: string) {
    return new MockQueryBuilder(table);
  },
};
