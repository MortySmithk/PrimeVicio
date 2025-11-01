// app/embed/tv/[...slug]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play } from 'lucide-react'; // Importado para o AdGate

// Carrega os dois players dinamicamente
const VideoPlayer = dynamic(() => import('@/components/video-player'), {
  loading: () => <LoadingSpinner />,
  ssr: false, 
});

const IframePlayer = dynamic(() => import('@/components/iframe-player'), {
    loading: () => <LoadingSpinner />,
    ssr: false
});

// Componente de loading
const LoadingSpinner = () => (
    <main className="w-screen h-screen flex items-center justify-center bg-black">
        <div className="loading-bars">
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
            <div className="loading-bar"></div>
        </div>
    </main>
);

type Stream = {
  url: string;
  name: string;
  thumbnailUrl?: string;
  playerType: 'custom' | 'iframe';
}

type StreamInfo = {
  streams: Stream[];
  title: string | null;
  backdropPath: string | null;
  nextEpisode?: { season: number; episode: number } | null;
};

export default function TvEmbedPage() {
  const params = useParams();
  const slug = params.slug as string[];
  const [tmdbId, season, episode] = slug || [];

  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [serverType, setServerType] = useState<'default' | 'vidsrc' | null>('default');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- INÍCIO DA MODIFICAÇÃO DE ANÚNCIO ---
  const [adClickCount, setAdClickCount] = useState(0);
  const adUrl = "https://otieu.com/4/10070814"; // URL do anúncio
  // --- FIM DA MODIFICAÇÃO DE ANÚNCIO ---

  useEffect(() => {
    if (!tmdbId || !season || !episode || !serverType) return; 

    const fetchStreamData = async () => {
      setIsLoading(true); 
      setError(null);
      try {
        const res = await fetch(`/api/stream/series/${tmdbId}/${season}/${episode}?source=${serverType}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Episódio não encontrado.");
        }
        const data: StreamInfo = await res.json();
        if (data.streams && data.streams.length > 0 && data.streams[0].url) {
          setStreamInfo(data);
        } else {
          if (serverType === 'default') {
            console.warn("Stream 'default' falhou ou vazio. Tentando 'vidsrc'...");
            setServerType('vidsrc'); 
          } else {
             setError("Nenhum link de streaming disponível (Dublado ou Legendado).");
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStreamData();
  }, [tmdbId, season, episode, serverType]); 

  const handleNextEpisode = () => {
    if (streamInfo?.nextEpisode) {
        const { season: nextSeason, episode: nextEpisode } = streamInfo.nextEpisode;
        window.location.href = `/embed/tv/${tmdbId}/${nextSeason}/${nextEpisode}`;
    }
  };
  
  // --- INÍCIO DA MODIFICAÇÃO DE ANÚNCIO ---
  const triggerAd = () => {
    const adWindow = window.open(adUrl, "_blank");
    if (!adWindow || adWindow.closed || typeof adWindow.closed === 'undefined') {
      console.warn("Popup ad might have been blocked.");
    }
  };

  const AdGateOverlay = () => {
    const handleClick = () => {
      if (adClickCount === 0) {
        triggerAd();
        setAdClickCount(1);
      } else if (adClickCount === 1) {
        triggerAd();
        setAdClickCount(2); // Muda o estado para 2, o que vai acionar a exibição do player
      }
    };

    return (
      <main className="w-screen h-screen flex flex-col items-center justify-center bg-black text-center p-4 cursor-pointer group/overlay" onClick={handleClick}>
        <div className="h-28 w-28 rounded-full bg-white/20 flex items-center justify-center transition-all duration-300 group-hover/overlay:bg-white/30 group-hover/overlay:scale-110">
          <Play className="h-16 w-16 text-white fill-white" />
        </div>
        <p className="text-white text-lg font-medium mt-4">
          {adClickCount === 0 ? "Clique para carregar o player" : "Clique novamente para iniciar"}
        </p>
      </main>
    );
  };
  // --- FIM DA MODIFICAÇÃO DE ANÚNCIO ---

  // --- LÓGICA DE RENDERIZAÇÃO ---
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <main className="w-screen h-screen flex items-center justify-center bg-black text-center p-4">
        <p className="text-zinc-400">{error}</p>
      </main>
    );
  }

  // Mostrar o player correto
  if (streamInfo) {
    const playerType = streamInfo.streams[0]?.playerType;
    
    // --- LÓGICA DE ANÚNCIO APLICADA AQUI ---
    if (playerType === 'iframe') {
        // Se for iframe (vidsrc), primeiro checa a contagem de cliques
        if (adClickCount < 2) {
            return <AdGateOverlay />;
        }

        // Se os cliques foram feitos, mostra o player
        return (
            <IframePlayer 
                src={streamInfo.streams[0].url} 
                title={streamInfo.title || `S${season} E${episode}`} 
            />
        );
    }
    // --- FIM DA LÓGICA DE ANÚNCIO ---
    
    if (playerType === 'custom') {
        return (
          <main className="w-screen h-screen relative bg-black">
            <VideoPlayer
              sources={streamInfo.streams}
              title={streamInfo.title ? `${streamInfo.title} - S${season} E${episode}` : `S${season} E${episode}`}
              backdropPath={streamInfo.backdropPath}
              rememberPosition={true}
              rememberPositionKey={`tv-${tmdbId}-s${season}-e${episode}-${serverType}`}
              hasNextEpisode={!!streamInfo.nextEpisode}
              onNextEpisode={handleNextEpisode}
            />
          </main>
        );
    }
  }

  // Fallback
  return (
    <main className="w-screen h-screen flex items-center justify-center bg-black text-center p-4">
      <p className="text-zinc-400">Ocorreu um erro inesperado.</p>
    </main>
  );
}