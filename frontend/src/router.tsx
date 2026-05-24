import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: false,
      },
    },
  });

  // Persist all query cache to localStorage — data loads instantly on navigation & reload
  const localStoragePersister = createSyncStoragePersister({
    storage: window.localStorage,
    key: "pgc-query-cache",
  });

  persistQueryClient({
    queryClient,
    persister: localStoragePersister,
    maxAge: 30 * 60 * 1000,
    buster: "v1",
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 5 * 60 * 1000,
  });

  return router;
};
