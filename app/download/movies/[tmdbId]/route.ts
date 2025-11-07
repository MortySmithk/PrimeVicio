// app/download/movies/[tmdbId]/route.ts
import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(
  request: Request,
  { params }: { params: { tmdbId: string } }
) {
  const { tmdbId } = params;
  if (!tmdbId) {
    return NextResponse.json({ error: "TMDB ID é necessário." }, { status: 400 });
  }

  // Apenas verifica a existência do link, não precisa do URL aqui
  const docRef = doc(firestore, "media", tmdbId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return NextResponse.json({ error: "Link de download não encontrado." }, { status: 404 });
  }
  
  const adUrl = "https://otieu.com/4/9835277";
  const proxyDownloadUrl = `/api/download-proxy/movies/${tmdbId}`;
  
  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
      <meta charset="UTF-8">
      <title>Download</title>
      <style>
          body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
              background-color: #111; 
              color: #eee; 
              margin: 0; 
              text-align: center; 
              display: grid;
              grid-template-areas:
                  "header header header"
                  "left main right"
                  "footer footer footer";
              grid-template-rows: auto 1fr auto;
              grid-template-columns: 1fr auto 1fr;
              min-height: 100vh;
              overflow-x: hidden; /* Evita scroll horizontal */
          }
          .ad-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 50px; /* Altura mínima para anúncios */
              overflow: hidden; /* Evita que anúncios grandes quebrem o layout */
              padding: 10px; /* Espaçamento para os anúncios */
              z-index: 20;
              background-color: #000; /* Fundo para áreas de anúncio */
          }
          .ad-header { grid-area: header; }
          .ad-left { grid-area: left; }
          .ad-right { grid-area: right; }
          .ad-footer { grid-area: footer; }
          
          .main-content {
              grid-area: main;
              display: flex;
              justify-content: center;
              align-items: center;
              padding: 2rem;
              z-index: 10;
          }
          .container { 
              padding: 2rem; 
              background-color: #1c1c1c; 
              border-radius: 8px; 
              box-shadow: 0 4px 15px rgba(0,0,0,0.5); 
          }
          h1 { color: #fff; margin-bottom: 1.5rem; }
          #downloadBtn { background-color: #f5c518; color: #111; border: none; padding: 1rem 2rem; font-size: 1.2rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background-color 0.3s; }
          #downloadBtn:hover { background-color: #e0b416; }
          .spinner { display: none; margin: 1rem auto 0; width: 48px; height: 48px; border: 5px solid #fff; border-bottom-color: #f5c518; border-radius: 50%; animation: rotation 1s linear infinite; }
          @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
  </head>
  <body>
      <div class="ad-container ad-header">
          <script async="async" data-cfasync="false" src="//pl28002746.effectivegatecpm.com/e6cbbbbeae71607da4342fd45975d7c4/invoke.js"></script>
          <div id="container-e6cbbbbeae71607da4342fd45975d7c4"></div>
      </div>

      <div class="ad-container ad-left">
          <script async="async" data-cfasync="false" src="//pl28002746.effectivegatecpm.com/e6cbbbbeae71607da4342fd45975d7c4/invoke.js"></script>
          <div id="container-e6cbbbbeae71607da4342fd45975d7c4"></div>
      </div>

      <div class="main-content">
          <div class="container">
              <h1>Preparando seu Download</h1>
              <button id="downloadBtn">Download</button>
              <div id="spinner" class="spinner"></div>
          </div>
      </div>

      <div class="ad-container ad-right">
          <script async="async" data-cfasync="false" src="//pl28002746.effectivegatecpm.com/e6cbbbbeae71607da4342fd45975d7c4/invoke.js"></script>
          <div id="container-e6cbbbbeae71607da4342fd45975d7c4"></div>
      </div>

      <div class="ad-container ad-footer">
          <script async="async" data-cfasync="false" src="//pl28002746.effectivegatecpm.com/e6cbbbbeae71607da4342fd45975d7c4/invoke.js"></script>
          <div id="container-e6cbbbbeae71607da4342fd45975d7c4"></div>
      </div>

      <script>
          const downloadBtn = document.getElementById('downloadBtn');
          const spinner = document.getElementById('spinner');

          downloadBtn.addEventListener('click', function() {
              downloadBtn.style.display = 'none';
              spinner.style.display = 'inline-block';
              
              // 2. Inicia o download através da rota de proxy
              window.location.href = '${proxyDownloadUrl}';

              // --- CORREÇÃO: ALTERAR TEMPO PARA 5 SEGUNDOS ---
              // 3. Redireciona para o anúncio após 5 segundos
              setTimeout(function() {
                  window.location.href = '${adUrl}';
              }, 5000); // Alterado de 4000 para 5000
              // --- FIM DA CORREÇÃO ---
          });
      </script>
  </body>
  </html>
  `;

  return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
  });
}