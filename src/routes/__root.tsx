import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { registerPWA } from "../lib/pwa-register";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { ensureFirebaseUser } from "@/integrations/firebase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Om Astro" },
      { name: "description", content: "Premium astrology consultations — chat and call with verified astrologers." },
      { name: "author", content: "Om Astro" },
      // PWA / mobile
      { name: "theme-color", content: "#0a0a0e" },
      { name: "background-color", content: "#0a0a0e" },
      { name: "color-scheme", content: "light dark" },
      { name: "application-name", content: "Om Astro" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Om Astro" },
      { name: "msapplication-TileColor", content: "#0a0a0e" },
      { name: "msapplication-TileImage", content: "/icons/icon-144.png" },
      { name: "format-detection", content: "telephone=no" },
      // Social
      { property: "og:title", content: "Om Astro" },
      { property: "og:description", content: "Premium astrology consultations — chat and call with verified astrologers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Om Astro" },
      { name: "twitter:description", content: "Premium astrology consultations — chat and call with verified astrologers." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/GJLzylxp06ZvaYfNnvCO8fOw9rs1/social-images/social-1780638264628-WhatsApp_Image_2026-06-05_at_10.51.50_AM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/GJLzylxp06ZvaYfNnvCO8fOw9rs1/social-images/social-1780638264628-WhatsApp_Image_2026-06-05_at_10.51.50_AM.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon.png" },
      { rel: "mask-icon", href: "/icons/icon-192.png", color: "#0a0a0e" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  console.log("[RootComponent] App mounted");
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Guarded registration: skips dev, iframes, ?sw=off.
    registerPWA();
  }, []);

  useEffect(() => {
    console.log("[RootComponent] First useEffect running - Firebase auth initialization");
    const initFirebaseForUser = async () => {
      console.log("[RootComponent] initFirebaseForUser called");
      try {
        console.log("[RootComponent] Calling ensureFirebaseUser...");
        await ensureFirebaseUser();
        console.log("[RootComponent] Firebase user ensured successfully");
      } catch (e) {
        console.error("[RootComponent] Failed to initialize Firebase auth:", e);
      }
    };
    initFirebaseForUser();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <IncomingCallModal />
    </QueryClientProvider>
  );
}
