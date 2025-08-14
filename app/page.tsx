"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"

// Montagens conhecidas do SonicPanel (ordem de tentativa)
const STREAMS = [
  "https://sonicpanel.oficialserver.com/8342/;",
  "https://sonicpanel.oficialserver.com/8342/stream",
  "https://sonicpanel.oficialserver.com/8342/;stream.mp3",
]

export default function RadioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const heartLayerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [status, setStatus] = useState("parado")
  const [volume, setVolume] = useState(0.85)
  const npRef = useRef<HTMLDivElement>(null)
  const djNameRef = useRef<HTMLSpanElement>(null)
  const programNameRef = useRef<HTMLSpanElement>(null)
  const listenersRef = useRef<HTMLSpanElement>(null)

  // Configuração inicial do volume
  useEffect(() => {
    const savedVol = localStorage.getItem("rh_vol")
    if (savedVol) {
      const vol = Number.parseFloat(savedVol)
      setVolume(vol)
      if (audioRef.current) {
        audioRef.current.volume = vol
      }
    }
  }, [])

  // Atualiza preenchimento do slider de volume
  const updateVolFill = (vol: number) => {
    const pct = Math.round(vol * 100)
    const slider = document.getElementById("vol") as HTMLInputElement
    if (slider) {
      slider.style.background = `linear-gradient(90deg, var(--accent) ${pct}%, #ffffff22 ${pct}%)`
    }
  }

  useEffect(() => {
    updateVolFill(volume)
  }, [volume])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    localStorage.setItem("rh_vol", newVolume.toString())
    updateVolFill(newVolume)
  }

  const tryPlayList = async () => {
    const audio = audioRef.current
    if (!audio) return false

    for (const url of STREAMS) {
      try {
        setStatus("conectando…")
        audio.pause()
        audio.removeAttribute("src")
        audio.src = url
        audio.load()
        await audio.play()
        setPlaying(true)
        return true
      } catch (e) {
        // tenta o próximo
      }
    }
    setStatus("erro ao tocar")
    return false
  }

  const handlePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (!playing) {
      await tryPlayList()
    } else {
      audio.pause()
      setPlaying(false)
      setStatus("pausado")
    }
  }

  // Efeito de corações
  const spawnHearts = (x: number, y: number) => {
    const heartLayer = heartLayerRef.current
    if (!heartLayer) return

    const colors = ["#ff4d6d", "#7b2ff7", "#22d1e8", "#ffd166", "#3be8b0", "#ff81a6"]
    const glyphs = ["❤", "🩷", "💜", "💙", "💚", "💛"]
    const n = 12 + Math.floor(Math.random() * 6)

    for (let i = 0; i < n; i++) {
      const h = document.createElement("div")
      h.className = "heart"
      h.textContent = glyphs[Math.floor(Math.random() * glyphs.length)]
      h.style.left = x + (Math.random() * 40 - 20) + "px"
      h.style.top = y + (Math.random() * 14 - 7) + "px"
      h.style.fontSize = 18 + Math.random() * 18 + "px"
      h.style.color = colors[Math.floor(Math.random() * colors.length)]

      heartLayer.appendChild(h)

      const dx = Math.random() * 160 - 80
      const dy = -140 - Math.random() * 120

      requestAnimationFrame(() => {
        h.style.transform = `translate(${dx}px, ${dy}px) scale(1.6)`
        h.style.opacity = "0"
      })

      setTimeout(() => h.remove(), 1500)
    }
  }

  // Som do clique
  const playSfx = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const d = 0.25
      const n = audioCtx.currentTime
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      const f = audioCtx.createBiquadFilter()

      f.type = "highpass"
      f.frequency.setValueAtTime(200, n)
      f.frequency.exponentialRampToValueAtTime(2200, n + d)

      o.type = "triangle"
      o.frequency.setValueAtTime(220, n)
      o.frequency.exponentialRampToValueAtTime(660, n + d)

      g.gain.setValueAtTime(0.0001, n)
      g.gain.exponentialRampToValueAtTime(0.6, n + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, n + d)

      o.connect(f)
      f.connect(g)
      g.connect(audioCtx.destination)
      o.start(n)
      o.stop(n + d)
    } catch (e) {
      // Falha silenciosa se não conseguir tocar o som
    }
  }

  // Handler do botão de amores
  const handleLoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Efeitos visuais e sonoros
    playSfx()

    const rect = e.currentTarget.getBoundingClientRect()
    const cardRect = document.getElementById("card")?.getBoundingClientRect()
    if (cardRect) {
      spawnHearts(rect.left + rect.width / 2 - cardRect.left, rect.top + rect.height / 2 - cardRect.top)
    }
  }

  return (
    <>
      <div className="wrap">
        <div className="player" id="card">
          <div id="heartLayer" ref={heartLayerRef}></div>

          <div className="header">
            <div className="cover" id="avatarCover">
              <img id="logo" alt="Rádio Habblive" src="https://i.imgur.com/sMH2OqO_d.webp" />
            </div>

            <div className="titles">
              <div className="brand">Rádio Habblive</div>
              <div className="np" id="np" ref={npRef}></div>
              <div className="badges">
                <div className="badge" id="locutor">
                  Locutor: <span id="locutorver" ref={djNameRef}></span>
                </div>
                <div className="badge" id="programa">
                  Programa: <span id="programaver" ref={programNameRef}></span>
                </div>
              </div>
              <div
                className="listenersRow"
                style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                id="listenersRow"
              >
                <span id="unicosver" ref={listenersRef}></span> <span id="ouvintesText">ouvindo agora</span>
              </div>
            </div>

            <div className="header-actions">
              <button id="loveBtn" className="loveBtn" title="Amores pro locutor(a)" onClick={handleLoveClick}>
                <span className="icon">❤</span>
                Amores pro locutor(a)
              </button>
            </div>
          </div>

          <div className="controls">
            <button className="play" id="playBtn" aria-label="Play/Pause" onClick={handlePlayPause}>
              <svg id="playIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {playing ? <path d="M6 5h4v14H6zm8 0h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
            </button>

            <div className="status" id="status">
              {status}
            </div>

            <div className="volCol">
              <div className="vol">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.25-3.9v7.8A4.5 4.5 0 0 0 16.5 12zm0-8.5v3a7.5 7.5 0 0 1 0 11v3a10.5 10.5 0 0 0 0-17z" />
                </svg>
                <input
                  id="vol"
                  className="slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                />
              </div>
            </div>
          </div>

          <div className="footer">
            <div className="links">
              <a className="btn" href="https://discord.gg/aCeNspzQzn" target="_blank" rel="noreferrer">
                <i className="fab fa-discord"></i> Discord
              </a>
              <a className="btn" href="https://habblive.in" target="_blank" rel="noreferrer">
                <i className="fas fa-home"></i> Entrar no Habblive
              </a>
            </div>
            <div className="hint">Rádio Habblive - Estamos a 10 anos com você! Fique Sintonizado =)</div>
          </div>

          <audio
            ref={audioRef}
            id="audio"
            preload="none"
            onPlaying={() => setStatus("Tocando...")}
            onWaiting={() => setStatus("reconectando…")}
            onStalled={() => setStatus("buffering…")}
            onError={() => {
              setStatus("erro de stream")
              setPlaying(false)
            }}
          />
        </div>
      </div>

      <div className="credit">desenvolvido por michael, discord: explodido</div>

      <script dangerouslySetInnerHTML={{ __html: `window.NOWPLAYING_POLL_MS=15000;` }} />
      <script defer src="/nowplaying.js" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
        const API = "/api/nowplaying";
        const $ = (id)=>document.getElementById(id);

        function fadeSet(el, txt){
          el.style.transition="opacity .16s"; el.style.opacity="0";
          setTimeout(()=>{ el.textContent = txt; el.style.opacity="1"; }, 160);
        }

        async function refreshNow() {
          try{
            const r = await fetch(API, { cache:"no-store" });
            const d = await r.json();
            fadeSet(document.getElementById("locutorName")  || document.getElementById("locutorver"),  d.locutor || "AutoDJ");
            fadeSet(document.getElementById("programaName") || document.getElementById("programaver"), d.programa || "Tocando as melhores!");
            const ouv = (d.ouvintes ?? 0);
            const t = \`\${ouv} conectados\`;
            const out = document.getElementById("ouvintesText") || document.getElementById("unicosver");
            if(out) fadeSet(out, /unicosver/.test(out.id) ? String(ouv) : \`👥 \${t}\`);
          }catch{}
        }

        refreshNow();
        setInterval(refreshNow, 15000);
      `,
        }}
      />
    </>
  )
}
