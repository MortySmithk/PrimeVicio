// app/embed/tv/[...slug]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
// --- MODIFICAÇÃO: Removido ServerSelectorOverlay ---
// import ServerSelectorOverlay from '@/components/ServerSelectorClient';

// Carrega os dois players dinamicamente
const VideoPlayer = dynamic(() => import('@/components/video-player'), {
  loading: () => <LoadingSpinner />,
  ssr: false, 
});

const IframePlayer = dynamic(() => import('@/components/iframe-player'), {
    loading: () => <LoadingSpinner />,
    ssr: false
});

// --- MODIFICAÇÃO: Componente de loading atualizado para usar CSS ---
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
// --- FIM DA MODIFICAÇÃO ---

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

// --- MODIFICAÇÃO: Removido tipo MediaInfo ---

export default function TvEmbedPage() {
  const params = useParams();
  const slug = params.slug as string[];
  const [tmdbId, season, episode] = slug || [];

  // --- MODIFICAÇÃO: Removido mediaInfo ---
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  // --- MODIFICAÇÃO: serverType definido como 'default' (Dublado) ---
  const [serverType, setServerType] = useState<'default' | 'vidsrc' | null>('default');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- MODIFICAÇÃO: Removido o primeiro useEffect (de fetchMediaInfo) ---
  
  // --- MODIFICAÇÃO: Este é agora o único useEffect ---
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
           // Tenta buscar o 'vidsrc' (legendado) se o 'default' (dublado) falhar
          if (serverType === 'default') {
            console.warn("Stream 'default' falhou ou vazio. Tentando 'vidsrc'...");
            setServerType('vidsrc'); // Isso irá re-disparar este useEffect
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
  }, [tmdbId, season, episode, serverType]); // Agora reage a serverType 

  // --- MODIFICAÇÃO: Removido handleServerSelect ---

  const handleNextEpisode = () => {
    if (streamInfo?.nextEpisode) {
        const { season: nextSeason, episode: nextEpisode } = streamInfo.nextEpisode;
        // --- MODIFICAÇÃO: Mantém o serverType atual ao ir para o próximo episódio ---
        const currentParams = new URLSearchParams(window.location.search);
        // Se quiséssemos voltar ao seletor, removeríamos a linha abaixo
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

  // --- MODIFICAÇÃO: Removido o bloco de renderização do seletor ---

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