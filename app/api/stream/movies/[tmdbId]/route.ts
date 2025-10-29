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
            console.log(`[Filme ${docSnap.id}] Stream(s) encontrado(s) no Firestore: ${docData.urls.length}`); // Log count
            return docData.urls.map((stream: any) => ({
                playerType: "custom",
                url: stream.url,
                name: stream.quality || "HD",
                thumbnailUrl: stream.thumbnailUrl, // Make sure this field exists in your Firestore data
            }));
        }
    }
    console.log(`[Filme ${docSnap.id}] Nenhum stream encontrado no Firestore.`); // Log if not found
    return null;
}

async function getTmdbInfo(tmdbId: string) {
    console.time(`[TMDB Info Fetch ${tmdbId}]`); // Start timer
    try {
        const tmdbRes = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
             console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); // End timer
            return {
                title: tmdbData.title,
                originalTitle: tmdbData.original_title,
                backdropPath: tmdbData.backdrop_path,
            };
        } else {
             console.warn(`[API de Filmes] Falha ao buscar TMDB para ${tmdbId}. Status: ${tmdbRes.status}`);
        }
    } catch (e: any) { // Type assertion for error object
        console.error(`[API de Filmes] Erro na busca TMDB para ${tmdbId}:`, e.message);
    }
     console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); // End timer even on error
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

   console.log(`[API Filme ${tmdbId}] Iniciando busca...`);
   console.time(`[API Filme ${tmdbId}] Total Execution`); // Start total timer

  try {
    console.time(`[API Filme ${tmdbId}] Parallel Fetch`); // Start parallel timer
    const [tmdbInfo, firestoreDoc] = await Promise.all([
        getTmdbInfo(tmdbId),
        getDoc(doc(firestore, "media", tmdbId))
    ]);
     console.timeEnd(`[API Filme ${tmdbId}] Parallel Fetch`); // End parallel timer

    const firestoreStreams = await getFirestoreStreamData(firestoreDoc);

    if (firestoreStreams) {
        console.timeEnd(`[API Filme ${tmdbId}] Total Execution`); // End total timer
        return NextResponse.json({ streams: firestoreStreams, ...tmdbInfo });
    }

    // MODIFICADO: Se não encontrou no Firestore, retorna array vazio
    console.log(`[API de Filmes] Nenhum stream encontrado no Firestore para TMDB ${tmdbId}.`);
    console.timeEnd(`[API Filme ${tmdbId}] Total Execution`); // End total timer
    return NextResponse.json({
        streams: [], // Retorna array vazio
        ...tmdbInfo
    });

  } catch (error: any) { // Type assertion for error object
    console.error(`[Filme ${tmdbId}] Erro geral na API:`, error.message);
     console.timeEnd(`[API Filme ${tmdbId}] Total Execution`); // End total timer on error
    return NextResponse.json({ error: "Falha ao processar a requisição do filme" }, { status: 500 });
  }
}