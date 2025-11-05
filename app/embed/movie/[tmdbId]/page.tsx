// app/embed/movie/[tmdbId]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play } from 'lucide-react'; // Importado para o AdGate

// Carrega os dois players dinamicamente
const VideoPlayer = dynamic(() => import('@/components/video-player'), {
  loading: () => <LoadingSpinner />,
  ssr: false 
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
};

// --- INÍCIO DA MODIFICAÇÃO DE WHITELIST ---
// Lista de domínios que não verão anúncios
const whitelistedHostnames = ["www.aicine.fun", "aicine.fun"];
// --- FIM DA MODIFICAÇÃO DE WHITELIST ---

export default function MovieEmbedPage() {
  const params = useParams();
  const tmdbId = params.tmdbId as string;
  
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [serverType, setServerType] = useState<'default' | 'vidsrc' | null>('default');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  
  // --- INÍCIO DA MODIFICAÇÃO DE ANÚNCIO ---
  const [adClickCount, setAdClickCount] = useState(0);
  const adUrl = "https://otieu.com/4/10070814"; // URL do anúncio
  // --- FIM DA MODIFICAÇÃO DE ANÚNCIO ---

  // --- INÍCIO DA MODIFICAÇÃO DE WHITELIST ---
  const [isWhitelisted, setIsWhitelisted] = useState(false);

  useEffect(() => {
    // Verifica o domínio que está incorporando este iframe
    try {
      if (typeof window !== "undefined" && document.referrer) {
        const referrerUrl = new URL(document.referrer);
        const referrerHostname = referrerUrl.hostname;
        
        if (whitelistedHostnames.includes(referrerHostname)) {
          setIsWhitelisted(true);
          // Pula os cliques do anúncio se o domínio estiver na lista
          setAdClickCount(2); 
        }
      }
    } catch (e) {
      console.warn("Não foi possível verificar o referrer:", e);
    }
  }, []);
  // --- FIM DA MODIFICAÇÃO DE WHITELIST ---

  useEffect(() => {
    if (!tmdbId || !serverType) return; 

    const fetchStreamData = async () => {
      setIsLoading(true); 
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
  }, [tmdbId, serverType]); 

  // --- INÍCIO DA MODIFICAÇÃO DE ANÚNCIO ---
  const triggerAd = () => {
    // A verificação do whitelist já acontece no AdGateOverlay
    const adWindow = window.open(adUrl, "_blank");
    if (!adWindow || adWindow.closed || typeof adWindow.closed === 'undefined') {
      console.warn("Popup ad might have been blocked.");
    }
  };

  const AdGateOverlay = () => {
    const handleClick = () => {
      // A verificação do whitelist acontece no useEffect principal,
      // que define adClickCount para 2 se estiver na lista.
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
                title={streamInfo.title || 'Filme'} 
            />
        );
    }
    // --- FIM DA LÓGICA DE ANÚNCIO ---
    
    if (playerType === 'custom') {
        return (
          <main className="w-screen h-screen relative bg-black">
            <VideoPlayer
              sources={streamInfo.streams}
              title={streamInfo.title || 'Filme'}
              backdropPath={streamInfo.backdropPath} 
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