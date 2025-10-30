// app/api/stream/movies/[tmdbId]/route.ts
import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebase";
import { doc, getDoc, DocumentSnapshot } from "firebase/firestore";

const TMDB_API_KEY = "860b66ade580bacae581f4228fad49fc";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function getFirestoreStreamData(docSnap: DocumentSnapshot) {
    if (docSnap.exists()) {
        const docData = docSnap.data();
        if (docData?.urls?.length > 0) {
            console.log(`[Filme ${docSnap.id}] Stream(s) encontrado(s) no Firestore: ${docData.urls.length}`);
            return docData.urls.map((stream: any) => ({
                playerType: "custom", 
                url: stream.url,
                name: stream.quality || "HD",
                thumbnailUrl: stream.thumbnailUrl, 
            }));
        }
    }
    console.log(`[Filme ${docSnap.id}] Nenhum stream encontrado no Firestore.`);
    return null;
}

async function getTmdbInfo(tmdbId: string) {
    console.time(`[TMDB Info Fetch ${tmdbId}]`); 
    try {
        const tmdbRes = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
             console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); 
            return {
                title: tmdbData.title,
                originalTitle: tmdbData.original_title,
                backdropPath: tmdbData.backdrop_path,
            };
        } else {
             console.warn(`[API de Filmes] Falha ao buscar TMDB para ${tmdbId}. Status: ${tmdbRes.status}`);
        }
    } catch (e: any) { 
        console.error(`[API de Filmes] Erro na busca TMDB para ${tmdbId}:`, e.message);
    }
     console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); 
    return { title: null, originalTitle: null, backdropPath: null };
}

export async function GET(
  request: Request,
  { params }: { params: { tmdbId: string } }
) {
  const { tmdbId } = params;
  if (!tmdbId) {
    return NextResponse.json({ error: "TMDB ID é necessário." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

   console.log(`[API Filme ${tmdbId}] Iniciando busca (Fonte: ${source || 'default'})...`);
   console.time(`[API Filme ${tmdbId}] Total Execution`); 

  try {
    // --- LÓGICA VIDSRC (LEGENDADO) ---
    if (source === 'vidsrc') {
        console.log(`[API de Filmes] Usando vidsrc-embed.ru (Legendado) para TMDB ${tmdbId}`);
        
        // --- CORREÇÃO APLICADA ---
        // Busca o Título/Backdrop
        const tmdbInfo = await getTmdbInfo(tmdbId);
        
        // Usa o TMDB ID diretamente, como você mostrou
        const vidsrcUrl = `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;
        // --- FIM DA CORREÇÃO ---

        console.timeEnd(`[API Filme ${tmdbId}] Total Execution`);
        return NextResponse.json({
            streams: [{ playerType: "iframe", url: vidsrcUrl, name: "Legendado" }],
            ...tmdbInfo // Passa o title e backdrop
        });
    }

    // --- LÓGICA FIRESTORE (DUBLADO) ---
    // Se não for 'vidsrc', busca Firestore e TMDB Info em paralelo
    console.time(`[API Filme ${tmdbId}] Parallel Fetch`); 
    const [tmdbInfo, firestoreDoc] = await Promise.all([
        getTmdbInfo(tmdbId),
        getDoc(doc(firestore, "media", tmdbId))
    ]);
     console.timeEnd(`[API Filme ${tmdbId}] Parallel Fetch`); 
    
    if (firestoreDoc) {
        const firestoreStreams = await getFirestoreStreamData(firestoreDoc);
        if (firestoreStreams) {
            console.timeEnd(`[API Filme ${tmdbId}] Total Execution`); 
            return NextResponse.json({ streams: firestoreStreams, ...tmdbInfo });
        }
    }

    console.log(`[API de Filmes] Nenhum stream 'default' (Firestore) encontrado para ${tmdbId}.`);
    console.timeEnd(`[API Filme ${tmdbId}] Total Execution`);
    return NextResponse.json({
        streams: [], 
        ...tmdbInfo
    });

  } catch (error: any) { 
    console.error(`[Filme ${tmdbId}] Erro geral na API:`, error.message);
     console.timeEnd(`[API Filme ${tmdbId}] Total Execution`); 
    return NextResponse.json({ error: "Falha ao processar a requisição do filme" }, { status: 500 });
  }
}