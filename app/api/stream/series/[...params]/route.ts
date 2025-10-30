// app/api/stream/series/[...params]/route.ts
import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebase";
import { doc, getDoc, DocumentSnapshot } from "firebase/firestore";

const TMDB_API_KEY = "860b66ade580bacae581f4228fad49fc";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function getFirestoreStreamData(docSnap: DocumentSnapshot, season: string, episodeNum: number) {
    if (docSnap.exists()) {
        const docData = docSnap.data();
        const seasonData = docData?.seasons?.[season];
        if (seasonData?.episodes) {
            const episodeData = seasonData.episodes.find((ep: any) => ep.episode_number === episodeNum);
            if (episodeData?.urls?.length > 0) {
                console.log(`[Série ${docSnap.id} S${season}E${episodeNum}] Stream(s) encontrado(s) no Firestore: ${episodeData.urls.length}`); 
                return episodeData.urls.map((stream: any) => ({
                    playerType: "custom", 
                    url: stream.url,
                    name: stream.quality || "HD",
                    thumbnailUrl: stream.thumbnailUrl, 
                }));
            }
        }
    }
     console.log(`[Série ${docSnap.id} S${season}E${episodeNum}] Nenhum stream encontrado no Firestore.`); 
    return null;
}

async function getTmdbInfo(tmdbId: string) {
    console.time(`[TMDB Info Fetch ${tmdbId}]`); 
    try {
        const tmdbRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); 
             return {
                title: tmdbData.name, 
                originalTitle: tmdbData.original_name,
                backdropPath: tmdbData.backdrop_path,
             };
        } else {
             console.warn(`[API de Séries] Falha ao buscar TMDB para ${tmdbId}. Status: ${tmdbRes.status}`);
        }
    } catch (e: any) { 
        console.error(`[API de Séries] Erro na busca TMDB para ${tmdbId}:`, e.message);
    }
     console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); 
    return { title: null, originalTitle: null, backdropPath: null };
}

async function findNextEpisode(tmdbId: string, currentSeason: number, currentEpisode: number): Promise<{ season: number; episode: number } | null> {
    try {
        console.time(`[NextEp Check Fetch Season ${currentSeason}]`);
        const seasonRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${currentSeason}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        console.timeEnd(`[NextEp Check Fetch Season ${currentSeason}]`);
        if (seasonRes.ok) {
            const seasonData = await seasonRes.json();
            const nextEpisodeInSeason = seasonData.episodes.find((ep: any) => ep.episode_number === currentEpisode + 1);
            if (nextEpisodeInSeason) {
                return { season: currentSeason, episode: currentEpisode + 1 };
            }
        } else {
             console.warn(`[NextEp Check] Failed to fetch season ${currentSeason} details. Status: ${seasonRes.status}`);
        }

        console.time(`[NextEp Check Fetch Season ${currentSeason + 1}]`);
        const nextSeasonRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${currentSeason + 1}?api_key=${TMDB_API_KEY}&language=pt-BR`);
         console.timeEnd(`[NextEp Check Fetch Season ${currentSeason + 1}]`);
        if (nextSeasonRes.ok) {
            const nextSeasonData = await nextSeasonRes.json();
            if (nextSeasonData.episodes && nextSeasonData.episodes.length > 0) {
                 const firstEpisodeNextSeason = nextSeasonData.episodes.find((ep:any) => ep.episode_number === 1);
                 if(firstEpisodeNextSeason) {
                     return { season: currentSeason + 1, episode: 1 };
                 }
            }
        } else if (nextSeasonRes.status !== 404) { 
             console.warn(`[NextEp Check] Failed to fetch season ${currentSeason + 1} details. Status: ${nextSeasonRes.status}`);
        }
    } catch (e: any) {
        console.error(`[NextEp Check] Error finding next episode for ${tmdbId} S${currentSeason}E${currentEpisode}:`, e.message);
    }
    return null; 
}


export async function GET(
  request: Request,
  { params }: { params: { params: string[] } }
) {
  const [tmdbId, season, episode] = params.params;
  const episodeNum = parseInt(episode, 10);
  const seasonNum = parseInt(season, 10); 

  if (!tmdbId || isNaN(seasonNum) || isNaN(episodeNum)) {
    return NextResponse.json({ error: "ID, temporada e episódio válidos são necessários." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source");

  const logPrefix = `[API Série ${tmdbId} S${season}E${episode}]`;
  console.log(`${logPrefix} Iniciando busca (Fonte: ${source || 'default'})...`);
  console.time(`${logPrefix} Total Execution`); 

  try {
    // --- LÓGICA VIDSRC (LEGENDADO) ---
    if (source === 'vidsrc') {
        console.log(`${logPrefix} Usando vidsrc-embed.ru (Legendado)`);

        // --- CORREÇÃO APLICADA ---
        // Busca Título/Backdrop e Próximo Episódio em paralelo
        const [tmdbInfo, nextEpisodeInfo] = await Promise.all([
             getTmdbInfo(tmdbId),
             findNextEpisode(tmdbId, seasonNum, episodeNum)
        ]);
        
        // Usa o TMDB ID diretamente, como você mostrou
        const vidsrcUrl = `https://vidsrc-embed.ru/embed/tv/${tmdbId}/${season}/${episode}`;
        // --- FIM DA CORREÇÃO ---

        const responseData: any = { ...tmdbInfo, nextEpisode: nextEpisodeInfo };
        responseData.streams = [{ playerType: "iframe", url: vidsrcUrl, name: "Legendado" }];
        console.timeEnd(`${logPrefix} Total Execution`);
        return NextResponse.json(responseData);
    }
    
    // --- LÓGICA FIRESTORE (DUBLADO) ---
    // Se não for 'vidsrc', busca tudo em paralelo
     console.time(`${logPrefix} Parallel Fetch`); 
    const [tmdbInfo, firestoreDoc, nextEpisodeInfo] = await Promise.all([
        getTmdbInfo(tmdbId),
        getDoc(doc(firestore, "media", tmdbId)),
        findNextEpisode(tmdbId, seasonNum, episodeNum) 
    ]);
     console.timeEnd(`${logPrefix} Parallel Fetch`); 

    const responseData: any = { ...tmdbInfo, nextEpisode: nextEpisodeInfo }; 
    
    if (firestoreDoc) {
        const firestoreStreams = await getFirestoreStreamData(firestoreDoc, season, episodeNum);
        if (firestoreStreams) {
            responseData.streams = firestoreStreams;
            console.timeEnd(`${logPrefix} Total Execution`); 
            return NextResponse.json(responseData);
        }
    }

    console.log(`${logPrefix} Nenhum stream 'default' (Firestore) encontrado.`);
    responseData.streams = []; 
    console.timeEnd(`${logPrefix} Total Execution`); 
    return NextResponse.json(responseData);

  } catch (error: any) { 
    console.error(`${logPrefix} Erro geral na API:`, error.message);
    console.timeEnd(`${logPrefix} Total Execution`); 
    return NextResponse.json({ error: "Falha ao processar a requisição da série" }, { status: 500 });
  }
}