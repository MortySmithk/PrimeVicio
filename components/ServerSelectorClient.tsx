// components/ServerSelectorClient.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerSelectorOverlayProps {
  title: string | null; // Pode ser nulo durante o carregamento
  backdropPath: string | null;
  onServerSelect: (language: string) => void; // Função chamada ao clicar em "Servidor Premium"
}

export const ServerSelectorOverlay: React.FC<ServerSelectorOverlayProps> = ({
  title,
  backdropPath,
  onServerSelect,
}) => {
  // --- MODIFICADO: 'Inglês' para 'Legendado' ---
  const [selectedLanguage, setSelectedLanguage] = useState<'Dublado' | 'Legendado'>('Dublado');
  const imageUrl = backdropPath ? `https://image.tmdb.org/t/p/w1280${backdropPath}` : null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 p-4">
      {/* Background Image (Opcional) */}
      {imageUrl && (
         <img
             src={imageUrl}
             alt=""
             className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm z-[-1]"
             draggable="false"
             loading="lazy" // Adicionado lazy loading
          />
      )}

      <div className="text-center text-white max-w-lg w-full bg-zinc-900/60 p-6 rounded-lg border border-zinc-700 backdrop-blur-md shadow-xl">
        <p className="text-sm text-zinc-400 mb-1">Você está assistindo:</p>
        <h2 className="text-xl font-semibold mb-5 text-shadow line-clamp-2">{title || 'Carregando título...'}</h2>

        <p className="text-md font-medium mb-3">Selecione um Áudio</p>
        <div className="flex justify-center gap-3 mb-6">
          {/* Botão Dublado */}
          <Button
            variant={selectedLanguage === 'Dublado' ? 'default' : 'secondary'}
            className={cn(
              "min-w-[120px]",
              selectedLanguage === 'Dublado'
                ? 'bg-white text-black hover:bg-gray-200' // Estilo selecionado
                : 'bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/80 ring-1 ring-zinc-600' // Estilo não selecionado
            )}
            onClick={() => setSelectedLanguage('Dublado')}
          >
            {selectedLanguage === 'Dublado' && <Check className="mr-2 h-4 w-4" />}
            Dublado
          </Button>

          {/* --- MODIFICADO: Botão Legendado --- */}
          <Button
            variant={selectedLanguage === 'Legendado' ? 'default' : 'secondary'}
            className={cn(
              "min-w-[120px] relative", 
              selectedLanguage === 'Legendado'
                ? 'bg-white text-black hover:bg-gray-200' // Estilo selecionado
                : 'bg-zinc-700/60 text-zinc-300 hover:bg-zinc-600/80 ring-1 ring-zinc-600' // Estilo não selecionado
            )}
            onClick={() => setSelectedLanguage('Legendado')}
          >
            {selectedLanguage === 'Legendado' && <Check className="mr-2 h-4 w-4" />}
            Legendado
          </Button>
        </div>

        {/* Botão Servidor Premium */}
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
          onClick={() => onServerSelect(selectedLanguage)} // Chama a função passada
        >
          <Tv className="mr-2 h-5 w-5" />
          Servidor Premium
        </Button>
      </div>
    </div>
  );
};

export default ServerSelectorOverlay;