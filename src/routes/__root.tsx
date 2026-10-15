import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { NativeShell } from "@/components/native-shell";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";
import { APP_NAME } from "@/lib/constants";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Find nearby restrooms on a map, read reviews, and rate them in toilets — five is pristine.",
      },
      { name: "theme-color", content: "#1e4f4a" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <PreviewHostBridge />
        <NativeShell />
        <AuthProvider>
          <QueryClientProvider client={client}>
            <Outlet />
          </QueryClientProvider>
        </AuthProvider>
        <Toaster
          position="top-center"
          offset={{ top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))" }}
          mobileOffset={{ top: "max(4.5rem, calc(env(safe-area-inset-top) + 3.5rem))" }}
          toastOptions={{
            className:
              "font-sans border-0 bg-surface text-foreground shadow-[var(--shadow-border)]",
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}
