// app/download/series/[...params]/route.ts
import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(
  request: Request,
  { params }: { params: { params: string[] } }
) {
  const [tmdbId, season, episode] = params.params;
  const episodeNum = parseInt(episode, 10);

  if (!tmdbId || !season || isNaN(episodeNum)) {
    return NextResponse.json({ error: "ID, temporada e episódio são necessários." }, { status: 400 });
  }

  const docRef = doc(firestore, "media", tmdbId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    // Adicione uma verificação mais específica se o episódio existe
    // (Opcional, pois o proxy fará isso, mas pode melhorar o UX)
    return NextResponse.json({ error: "Link de download não encontrado para esta série." }, { status: 404 });
  }
  
  const adUrl = "https://otieu.com/4/9835277";
  const proxyDownloadUrl = `/api/download-proxy/series/${tmdbId}/${season}/${episode}`;

  const html = `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
      <meta charset="UTF-8">
      <title>Download</title>
      <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #111; color: #eee; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
          .container { padding: 2rem; background-color: #1c1c1c; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
          h1 { color: #fff; margin-bottom: 1.5rem; }
          #downloadBtn { background-color: #f5c518; color: #111; border: none; padding: 1rem 2rem; font-size: 1.2rem; font-weight: bold; border-radius: 6px; cursor: pointer; transition: background-color 0.3s; }
          #downloadBtn:hover { background-color: #e0b416; }
          .spinner { display: none; margin: 1rem auto 0; width: 48px; height: 48px; border: 5px solid #fff; border-bottom-color: #f5c518; border-radius: 50%; animation: rotation 1s linear infinite; }
          @keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
  </head>
  <body>
      <div class="container">
          <h1>Preparando seu Download</h1>
          <button id="downloadBtn">Download</button>
          <div id="spinner" class="spinner"></div>
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