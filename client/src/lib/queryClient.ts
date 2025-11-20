import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Try to parse JSON error response
    try {
      const errorData = JSON.parse(text);
      // Create error object with parsed data
      const error: any = new Error(errorData.message || text);
      error.requiresConfirmation = errorData.requiresConfirmation;
      error.statusCode = res.status;
      throw error;
    } catch {
      // If not JSON, throw with original format
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log('API Request:', method, url, { data, credentials: 'include' });
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log('API Response:', res.status, res.statusText, {
    headers: Object.fromEntries(res.headers.entries()),
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL with query parameters
    let url = "";
    let params: Record<string, any> = {};
    
    for (let i = 0; i < queryKey.length; i++) {
      const part = queryKey[i];
      if (typeof part === 'string') {
        url += part;
      } else if (typeof part === 'object' && part !== null) {
        // This is a parameters object
        params = part as Record<string, any>;
      }
    }
    
    // Add query parameters if any
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      }
      url += '?' + searchParams.toString();
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
