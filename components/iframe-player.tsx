// components/iframe-player.tsx
"use client"

import React from 'react';

interface IframePlayerProps {
  src: string;
  title: string;
}

export default function IframePlayer({ src, title }: IframePlayerProps) {
  return (
    <main className="w-screen h-screen relative bg-black">
        <iframe
            src={src}
            title={title}
            className="relative z-[1] h-full w-full border-0"
            allow="fullscreen; autoplay"
            allowFullScreen
            // --- CORREÇÃO ---
            // O atributo 'sandbox' anterior era muito restritivo e impedia
            // o player do vidsrc de carregar. 
            // Foi removido para permitir a funcionalidade total do player externo.
            // Adicionado 'referrerPolicy' para compatibilidade.
            referrerPolicy="no-referrer-when-downgrade"
        />
    </main>
  );
}