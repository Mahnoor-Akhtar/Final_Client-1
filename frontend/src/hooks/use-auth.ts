import { useEffect, useState } from "react";
import type { Session, User } from "@/integrations/mern/client";
import { mern } from "@/integrations/mern/client";

export type AppRole = "admin" | "teacher" | "student";

export interface AuthState {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = mern.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await mern
            .from("user_roles")
            .select("role")
            .eq("user_id", s.user.id);
          const roles = (data ?? []).map((r) => r.role as AppRole);
          const best = roles.includes("admin")
            ? "admin"
            : roles.includes("teacher")
              ? "teacher"
              : roles.includes("student")
                ? "student"
                : null;
          setRole(best);
          setLoading(false);
        }, 0);
      } else {
        setRole(null);
        setLoading(false);
      }
    });
    mern.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, role, loading };
}
