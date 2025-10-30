// app/embed/movie/[tmdbId]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ServerSelectorOverlay from '@/components/ServerSelectorClient';

// Carrega os dois players dinamicamente
const VideoPlayer = dynamic(() => import('@/components/video-player'), {
  loading: () => <LoadingSpinner />,
  ssr: false 
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
};

type MediaInfo = {
  title: string | null;
  backdropPath: string | null;
}

export default function MovieEmbedPage() {
  const params = useParams();
  const tmdbId = params.tmdbId as string;
  
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [serverType, setServerType] = useState<'default' | 'vidsrc' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Um único estado de loading

  // 1. Efeito para buscar TÍTULO e BACKDROP (para o seletor)
  useEffect(() => {
    if (!tmdbId) return;
    const fetchMediaInfo = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Busca a API (sem source) SÓ para pegar o título e backdrop
        const res = await fetch(`/api/stream/movies/${tmdbId}`); 
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Filme não encontrado.");
        }
        const data: StreamInfo = await res.json();
        setMediaInfo({ title: data.title, backdropPath: data.backdropPath });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false); // Para de carregar (mostra o seletor)
      }
    };
    fetchMediaInfo();
  }, [tmdbId]);

  // 2. Efeito para buscar os STREAMS (depois da seleção)
  useEffect(() => {
    if (!tmdbId || !serverType) return; // Só roda se o serverType foi definido

    const fetchStreamData = async () => {
      setIsLoading(true); // Mostra o GIF de novo
      setError(null);
      try {
        const res = await fetch(`/api/stream/movies/${tmdbId}?source=${serverType}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Filme não encontrado.");
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
  }, [tmdbId, serverType]);

  // 3. Handler para o seletor
  const handleServerSelect = (language: string) => {
    setServerType(language === 'Dublado' ? 'default' : 'vidsrc');
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
                title={mediaInfo.title}
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
                title={streamInfo.title || 'Filme'} 
            />
        );
    }
    
    if (playerType === 'custom') {
        return (
          <main className="w-screen h-screen relative bg-black">
            <VideoPlayer
              sources={streamInfo.streams}
              title={streamInfo.title || 'Filme'}
              backdropPath={streamInfo.backdropPath} // Passa o backdrop para o player customizado
              rememberPosition={true}
              rememberPositionKey={`movie-${tmdbId}-${serverType}`}
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