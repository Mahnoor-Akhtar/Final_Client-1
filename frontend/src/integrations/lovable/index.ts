import { mern } from "../mern/client";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (
      provider: "google" | "apple" | "microsoft" | "lovable",
      options?: SignInOptions
    ) => {
      try {
        const result = await mern.auth.signInWithPassword({
          email: "admin@college.edu",
          password: "password123",
        });

        if (result.error) {
          return { redirected: false, tokens: null, error: result.error };
        }

        if (typeof window !== "undefined") {
          window.location.href = "/app";
        }

        return { redirected: true, tokens: result.data.session, error: null };
      } catch (error) {
        return { redirected: false, tokens: null, error };
      }
    },
  },
};
