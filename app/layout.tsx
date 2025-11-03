import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { FavoritesProvider } from "@/components/favorites-context"
import { LayoutWrapper } from "@/components/layout-wrapper"

export const metadata: Metadata = {
  title: "PrimeVicio - API,EMBED DE FILMES E SÉRIES GRÁTIS",
  description: "API DE EMBED COM FILMES E SÉRIES com players rápidos e conteúdo atualizado e Totalmente Gratuito.",
  icons: "https://i.ibb.co/xqMzw3J1/primevicioicon.png",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, orientation=portrait" />
        <meta name="google-site-verification" content="q5GnYgfSLz8RBSXp5gg13u_GOBloxYaSi8gSLA3QhPs" />
        <script src="https://cdn.jsdelivr.net/npm/disable-devtool@latest"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                DisableDevtool({
                  disableMenu: true,
                  disableSelect: false,
                  disableCopy: false,
                  disableCut: true,
                  disablePaste: false,
                  clearLog: true,
                  interval: 500,
                  ondevtoolopen: function(type, next) {
                    window.location.href = 'https://i.ibb.co/5hH6bbp2/tentando-inspecionar-o-site.png';
                  }
                });
              } catch(e) {
                console.warn('DisableDevtool failed to initialize');
              }
            `,
          }}
        />
        <style>{`
          html {
            font-family: ${GeistSans.style.fontFamily};
            --font-sans: ${GeistSans.variable};
            --font-mono: ${GeistMono.variable};
          }
        `}</style>
      </head>
      <body className="bg-zinc-950">
        <FavoritesProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </FavoritesProvider>
      </body>
    </html>
  )
}