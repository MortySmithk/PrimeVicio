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
                console.log(`[Série ${docSnap.id} S${season}E${episodeNum}] Stream(s) encontrado(s) no Firestore: ${episodeData.urls.length}`); // Log count
                return episodeData.urls.map((stream: any) => ({
                    playerType: "custom",
                    url: stream.url,
                    name: stream.quality || "HD",
                    thumbnailUrl: stream.thumbnailUrl, // Make sure this field exists in your Firestore data
                }));
            }
        }
    }
     console.log(`[Série ${docSnap.id} S${season}E${episodeNum}] Nenhum stream encontrado no Firestore.`); // Log if not found
    return null;
}

async function getTmdbInfo(tmdbId: string) {
    console.time(`[TMDB Info Fetch ${tmdbId}]`); // Start timer
    try {
        // Fetch base TV show details for title/backdrop
        const tmdbRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`);
        if (tmdbRes.ok) {
            const tmdbData = await tmdbRes.json();
            console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); // End timer
             return {
                title: tmdbData.name, // Use 'name' for TV shows
                originalTitle: tmdbData.original_name,
                backdropPath: tmdbData.backdrop_path,
             };
        } else {
             console.warn(`[API de Séries] Falha ao buscar TMDB para ${tmdbId}. Status: ${tmdbRes.status}`);
        }
    } catch (e: any) { // Type assertion for error object
        console.error(`[API de Séries] Erro na busca TMDB para ${tmdbId}:`, e.message);
    }
     console.timeEnd(`[TMDB Info Fetch ${tmdbId}]`); // End timer even on error
    return { title: null, originalTitle: null, backdropPath: null };
}

// --- ADDED Helper Function to find next episode ---
// This requires fetching season details which might add latency if not already cached
async function findNextEpisode(tmdbId: string, currentSeason: number, currentEpisode: number): Promise<{ season: number; episode: number } | null> {
    try {
        // Fetch details for the current season
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

        // If not in current season, check next season
        console.time(`[NextEp Check Fetch Season ${currentSeason + 1}]`);
        const nextSeasonRes = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${currentSeason + 1}?api_key=${TMDB_API_KEY}&language=pt-BR`);
         console.timeEnd(`[NextEp Check Fetch Season ${currentSeason + 1}]`);
        if (nextSeasonRes.ok) {
            const nextSeasonData = await nextSeasonRes.json();
            if (nextSeasonData.episodes && nextSeasonData.episodes.length > 0) {
                 // Assuming the first episode of the next season is episode 1
                 const firstEpisodeNextSeason = nextSeasonData.episodes.find((ep:any) => ep.episode_number === 1);
                 if(firstEpisodeNextSeason) {
                     return { season: currentSeason + 1, episode: 1 };
                 }
            }
        } else if (nextSeasonRes.status !== 404) { // Ignore 404, just means season doesn't exist
             console.warn(`[NextEp Check] Failed to fetch season ${currentSeason + 1} details. Status: ${nextSeasonRes.status}`);
        }
    } catch (e: any) {
        console.error(`[NextEp Check] Error finding next episode for ${tmdbId} S${currentSeason}E${currentEpisode}:`, e.message);
    }
    return null; // No next episode found
}
// ---------------------------------------------


export async function GET(
  request: Request,
  { params }: { params: { params: string[] } }
) {
  const [tmdbId, season, episode] = params.params;
  const episodeNum = parseInt(episode, 10);
  const seasonNum = parseInt(season, 10); // Parse season number

  if (!tmdbId || isNaN(seasonNum) || isNaN(episodeNum)) {
    return NextResponse.json({ error: "ID, temporada e episódio válidos são necessários." }, { status: 400 });
  }

  const logPrefix = `[API Série ${tmdbId} S${season}E${episode}]`;
  console.log(`${logPrefix} Iniciando busca...`);
  console.time(`${logPrefix} Total Execution`); // Start total timer

  try {
     console.time(`${logPrefix} Parallel Fetch`); // Start parallel timer
    // MODIFIED: Fetch next episode info in parallel
    const [tmdbInfo, firestoreDoc, nextEpisodeInfo] = await Promise.all([
        getTmdbInfo(tmdbId),
        getDoc(doc(firestore, "media", tmdbId)),
        findNextEpisode(tmdbId, seasonNum, episodeNum) // Fetch next episode details
    ]);
     console.timeEnd(`${logPrefix} Parallel Fetch`); // End parallel timer

    const firestoreStreams = await getFirestoreStreamData(firestoreDoc, season, episodeNum);

    const responseData: any = { ...tmdbInfo, nextEpisode: nextEpisodeInfo }; // Include next episode info

    if (firestoreStreams) {
        responseData.streams = firestoreStreams;
        console.timeEnd(`${logPrefix} Total Execution`); // End total timer
        return NextResponse.json(responseData);
    }

    // MODIFICADO: Se não encontrou no Firestore, retorna array vazio
    console.log(`${logPrefix} Nenhum stream encontrado no Firestore.`);
    responseData.streams = []; // Retorna array vazio
    console.timeEnd(`${logPrefix} Total Execution`); // End total timer
    return NextResponse.json(responseData);

  } catch (error: any) { // Type assertion for error object
    console.error(`${logPrefix} Erro geral na API:`, error.message);
    console.timeEnd(`${logPrefix} Total Execution`); // End total timer on error
    return NextResponse.json({ error: "Falha ao processar a requisição da série" }, { status: 500 });
  }
}