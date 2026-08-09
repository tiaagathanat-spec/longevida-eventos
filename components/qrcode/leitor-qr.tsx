"use client";

// Leitor de QR Code para a Organização no dia do evento.
//
// Abre a câmera (getUserMedia), decodifica o QR em tempo real com a lib
// `jsqr` e chama `onLeitura(identificador)` quando encontra um código.
// Também oferece um campo de digitação manual como fallback (útil em
// notebooks sem câmera ou com pouca iluminação).

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LeitorQrProps = {
  onLeitura: (identificador: string) => void;
  pararAoLer?: boolean;
};

export function LeitorQr({ onLeitura, pararAoLer = true }: LeitorQrProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lidoRef = useRef(false);

  const [erroCamera, setErroCamera] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [modo, setModo] = useState<"camera" | "manual">("camera");
  const [codigoManual, setCodigoManual] = useState("");

  const pararCamera = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraAtiva(false);
  }, []);

  // Loop de leitura: desenha o frame da câmera num canvas e tenta
  // decodificar com jsQR a cada frame.
  const lerFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      frameRef.current = requestAnimationFrame(lerFrame);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      frameRef.current = requestAnimationFrame(lerFrame);
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imagem = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const codigo = jsQR(imagem.data, imagem.width, imagem.height, {
      inversionAttempts: "dontInvert",
    });

    if (codigo?.data) {
      const identificador = codigo.data.trim();
      lidoRef.current = true;
      onLeitura(identificador);
      if (pararAoLer) pararCamera();
      return;
    }

    frameRef.current = requestAnimationFrame(lerFrame);
  }, [onLeitura, pararAoLer, pararCamera]);

  const iniciarCamera = useCallback(async () => {
    setErroCamera(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      lidoRef.current = false;
      setCameraAtiva(true);
      frameRef.current = requestAnimationFrame(lerFrame);
    } catch {
      setErroCamera(true);
      setCameraAtiva(false);
    }
  }, [lerFrame]);

  useEffect(() => {
    iniciarCamera();
    return pararCamera;
  }, [iniciarCamera, pararCamera]);

  function enviarManual() {
    const codigo = codigoManual.trim();
    if (!codigo) return;
    lidoRef.current = true;
    onLeitura(codigo);
    setCodigoManual("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
        <button
          type="button"
          onClick={() => setModo("camera")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            modo === "camera"
              ? "bg-brand-green/10 text-brand-green"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Camera className="h-4 w-4" />
          Câmera
        </button>
        <button
          type="button"
          onClick={() => setModo("manual")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            modo === "manual"
              ? "bg-brand-green/10 text-brand-green"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Keyboard className="h-4 w-4" />
          Digitar código
        </button>
      </div>

      {modo === "camera" ? (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black dark:border-slate-800">
          <video
            ref={videoRef}
            playsInline
            muted
            className="aspect-video w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-2xl border-2 border-dashed border-white/70" />
          </div>
          {erroCamera && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-center">
              <div>
                <p className="text-sm font-medium text-white">
                  Não foi possível acessar a câmera.
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Permita o acesso no navegador ou use o modo &quot;Digitar
                  código&quot;.
                </p>
                <Button
                  variant="secondary"
                  onClick={iniciarCamera}
                  className="mt-4"
                >
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Digite o identificador impresso no QR Code da inscrição
            (formato LQ-…).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input
                id="codigo-manual"
                label="Identificador"
                placeholder="LQ-xxxxxxxxxx"
                value={codigoManual}
                onChange={(e) => setCodigoManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") enviarManual();
                }}
              />
            </div>
            <Button onClick={enviarManual} className="sm:mt-6">
              Buscar
            </Button>
          </div>
        </div>
      )}

      {!cameraAtiva && modo === "camera" && !erroCamera && (
        <p className="text-center text-xs text-slate-400">
          Abrindo câmera… Aponte para o QR Code da inscrição.
        </p>
      )}
    </div>
  );
}
