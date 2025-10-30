// app/embed/tv/[...slug]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ServerSelectorOverlay from '@/components/ServerSelectorClient';

// Carrega os dois players dinamicamente
const VideoPlayer = dynamic(() => import('@/components/video-player'), {
  loading: () => <LoadingSpinner />,
  ssr: false, 
});

const IframePlayer = dynamic(() => import('@/components/iframe-player'), {
    loading: () => <LoadingSpinner />,
    ssr: false
});

// Componente de loading interno
const LoadingSpinner = () => (
    <main className="w-screen h-screen flex items-center justify-center bg-black">
        <img src="https://i.ibb.co/fVcZxsvM/1020.gif" alt="Carregando..." className="w-64 h-64" />
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

type MediaInfo = {
  title: string | null;
  backdropPath: string | null;
}

export default function TvEmbedPage() {
  const params = useParams();
  const slug = params.slug as string[];
  const [tmdbId, season, episode] = slug || [];

  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [serverType, setServerType] = useState<'default' | 'vidsrc' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Efeito para buscar TÍTULO e BACKDROP (para o seletor)
  useEffect(() => {
    if (!tmdbId || !season || !episode) {
      setError("Informações inválidas para carregar a série.");
      setIsLoading(false);
      return;
    }

    const fetchMediaInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/stream/series/${tmdbId}/${season}/${episode}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Episódio não encontrado.");
        }
        const data: StreamInfo = await res.json();
        setMediaInfo({ title: data.title, backdropPath: data.backdropPath });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMediaInfo();
  }, [tmdbId, season, episode]);
  
  // 2. Efeito para buscar os STREAMS (depois da seleção)
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
          setError("Nenhum link de streaming disponível para esta opção.");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStreamData();
  }, [tmdbId, season, episode, serverType]); 

  // 3. Handler para o seletor
  const handleServerSelect = (language: string) => {
    setServerType(language === 'Dublado' ? 'default' : 'vidsrc');
  };

  const handleNextEpisode = () => {
    if (streamInfo?.nextEpisode) {
        const { season: nextSeason, episode: nextEpisode } = streamInfo.nextEpisode;
        window.location.href = `/embed/tv/${tmdbId}/${nextSeason}/${nextEpisode}`;
    }
  };
  
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

  // Mostrar seletor
  if (mediaInfo && !serverType) {
     return (
        <main className="w-screen h-screen relative bg-black">
            <ServerSelectorOverlay
                title={mediaInfo.title ? `${mediaInfo.title} - S${season} E${episode}` : `S${season} E${episode}`}
                backdropPath={mediaInfo.backdropPath}
                onServerSelect={handleServerSelect}
            />
        </main>
     );
  }

  // Mostrar o player correto
  if (streamInfo) {
    const playerType = streamInfo.streams[0]?.playerType;
    
    if (playerType === 'iframe') {
        return (
            <IframePlayer 
                src={streamInfo.streams[0].url} 
                title={streamInfo.title || `S${season} E${episode}`} 
            />
        );
    }
    
    if (playerType === 'custom') {
        return (
          <main className="w-screen h-screen relative bg-black">
            <VideoPlayer
              sources={streamInfo.streams}
              title={streamInfo.title || `S${season} E${episode}`}
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