import { useEffect, useRef, useState } from 'react';
import { Instagram, MapPin, Globe, ArrowLeft, Volume2, VolumeX, Play } from 'lucide-react';

// =========================================================================
// INSIRA A URL DO SEU VÍDEO HOSPEDADO NO CLOUDINARY AQUI:
// =========================================================================
export const DEFAULT_VIDEO_URL =
  'https://res.cloudinary.com/dfbsag282/video/upload/v1794403850/corretor_oa2irz.mp4';

// Links para fácil ativação futura quando desejar torná-los clicáveis:
export const SOCIAL_LINKS = {
  instagram: '',
  location: '',
  whatsapp: '',
  website: '',
};

// Tipagem estendida para suportar métodos e eventos de tela cheia legados/Safari
interface CustomHtmlVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
}

interface CustomDocument extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<CustomHtmlVideoElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Permite também testar via parâmetro de URL (ex: ?url=https://...) sem obrigatoriamente editar o código
  const [videoSrc, setVideoSrc] = useState(DEFAULT_VIDEO_URL);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('url');
    if (queryUrl) {
      setVideoSrc(queryUrl);
    }
  }, []);

  // Monitorar mudanças no status de tela cheia (navegadores desktop, Android e iOS)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as CustomDocument;
      const isFs = Boolean(
        doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    const handleWebkitBeginFs = () => setIsFullscreen(true);
    const handleWebkitEndFs = () => setIsFullscreen(false);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const video = videoRef.current;
    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleWebkitBeginFs);
      video.addEventListener('webkitendfullscreen', handleWebkitEndFs);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleWebkitBeginFs);
        video.removeEventListener('webkitendfullscreen', handleWebkitEndFs);
      }
    };
  }, []);

  // Função para solicitar tela cheia em qualquer plataforma (Desktop, Android, iOS Safari)
  const requestFullscreenMode = async () => {
    const container = containerRef.current;
    const video = videoRef.current;

    try {
      if (container?.requestFullscreen) {
        await container.requestFullscreen();
      } else if ((container as any)?.webkitRequestFullscreen) {
        await (container as any).webkitRequestFullscreen();
      } else if ((container as any)?.mozRequestFullScreen) {
        await (container as any).mozRequestFullScreen();
      } else if ((container as any)?.msRequestFullscreen) {
        await (container as any).msRequestFullscreen();
      } else if (video?.webkitEnterFullscreen) {
        // Fallback específico para Safari no iPhone
        video.webkitEnterFullscreen();
      }
    } catch {
      // Alguns navegadores podem restringir tela cheia em iframes sem permissões
    }
  };

  // Sair de tela cheia com segurança
  const exitFullscreenMode = async () => {
    try {
      const doc = document as CustomDocument;
      if (
        doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch {
      // Ignora erro ao sair de tela cheia
    }
  };

  // Iniciar reprodução e solicitar tela cheia
  const handleStart = async () => {
    setHasStarted(true);

    const video = videoRef.current;
    if (video) {
      try {
        // Tenta iniciar a reprodução
        const playPromise = video.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      } catch (err) {
        console.warn('Tentando novamente com mute ativado:', err);
        try {
          video.muted = true;
          setIsMuted(true);
          await video.play();
          setIsPlaying(true);
        } catch (e) {
          console.error('Falha geral ao iniciar:', e);
        }
      }
    }

    // Solicita tela cheia de forma não-bloqueante
    try {
      await requestFullscreenMode();
    } catch {}
  };

  // Retornar para a tela inicial
  const handleResetToHome = async () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {}
    }
    setIsPlaying(false);
    setHasStarted(false);

    // Sair da tela cheia se estiver ativa
    await exitFullscreenMode();
  };

  // Alternar som (Mute / Unmute)
  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      const newMuted = !isMuted;
      video.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  // Continuar vídeo caso tenha pausado
  const resumePlayback = () => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-screen h-screen bg-black flex items-center justify-center overflow-hidden ${
        hasStarted && isFullscreen ? 'cursor-none' : 'cursor-default'
      }`}
      style={{ margin: 0, padding: 0 }}
    >
      {/* Vídeo renderizado no fundo */}
      <video
        ref={videoRef}
        src={videoSrc}
        loop
        muted={isMuted}
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          // Garantir loop contínuo infinito mesmo se o navegador parar no fim dos 8s
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
          }
        }}
        className="w-full h-full portrait:object-cover landscape:object-contain bg-black"
      />

      {/* Camada de 80% de escurecimento na tela inicial (fade suave cinematográfico de 1.5s) */}
      <div
        className={`absolute inset-0 bg-black/80 pointer-events-none z-10 transition-opacity duration-[1500ms] ease-in-out ${
          hasStarted ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Botão para retornar à tela inicial (visível quando o vídeo estiver rodando) */}
      {hasStarted && (
        <div
          className="absolute top-5 left-5 z-40 flex items-center gap-2 pointer-events-auto transition-opacity duration-300"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: 'env(safe-area-inset-left, 0px)',
          }}
        >
          {/* Botão Voltar / Início */}
          <button
            type="button"
            onClick={handleResetToHome}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/25 text-white/90 hover:text-white text-xs font-medium tracking-wider uppercase transition-all duration-200 cursor-pointer shadow-xl active:scale-95"
            title="Voltar para a tela inicial"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2]" />
            <span>Início</span>
          </button>

          {/* Botão de Som (Mudo / Com Som) */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/25 text-white/90 hover:text-white transition-all duration-200 cursor-pointer shadow-xl active:scale-95"
            title={isMuted ? 'Ativar áudio' : 'Silenciar áudio'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 stroke-[2]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 stroke-[2]" />
            )}
          </button>
        </div>
      )}

      {/* Indicador de reprodução caso o vídeo esteja pausado durante a exibição */}
      {hasStarted && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto bg-black/30">
          <button
            type="button"
            onClick={resumePlayback}
            className="p-4 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/30 text-white transition-all active:scale-95 cursor-pointer shadow-2xl"
            title="Continuar vídeo"
          >
            <Play className="w-8 h-8 fill-white translate-x-0.5" />
          </button>
        </div>
      )}

      {/* Botão minimalista central "INICIAR" (visível apenas na tela inicial) */}
      <div
        className={`absolute inset-0 flex items-center justify-center pointer-events-none z-20 transition-all duration-[900ms] ease-in-out ${
          hasStarted ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
      >
        <button
          type="button"
          onClick={handleStart}
          className="pointer-events-auto px-7 py-2.5 border border-white/60 hover:border-white active:border-white text-white font-medium text-xs sm:text-sm tracking-[0.25em] uppercase rounded-full transition-all duration-200 cursor-pointer bg-black/40 hover:bg-black/60 active:scale-95 shadow-2xl backdrop-blur-sm"
        >
          INICIAR
        </button>
      </div>

      {/* Ícones discretos posicionados na parte inferior com alto contraste (visíveis em qualquer fundo) */}
      <div
        className="absolute bottom-8 sm:bottom-10 inset-x-0 flex items-center justify-center pointer-events-none z-30 transition-opacity duration-500"
        aria-hidden="true"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Cápsula de contraste escurecida translúcida que garante visibilidade contra fundo branco ou claro */}
        <div className="flex items-center justify-center gap-6 sm:gap-7 px-5 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/25 shadow-2xl text-white">
          {/* Instagram */}
          <span className="p-0.5 text-white drop-shadow" title="Instagram">
            <Instagram className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.5]" />
          </span>

          {/* Localização */}
          <span className="p-0.5 text-white drop-shadow" title="Localização">
            <MapPin className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.5]" />
          </span>

          {/* WhatsApp */}
          <span className="p-0.5 text-white drop-shadow" title="WhatsApp">
            <svg
              className="w-4 h-4 sm:w-4.5 sm:h-4.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>

          {/* Site */}
          <span className="p-0.5 text-white drop-shadow" title="Site">
            <Globe className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[1.5]" />
          </span>
        </div>
      </div>
    </div>
  );
}
