;(() => {
  const POLL = window.NOWPLAYING_POLL_MS | 0 || 15000
  const API = "/api/nowplaying"

  function fadeSet(id, val) {
    const el = document.getElementById(id)
    if (!el) return
    el.style.transition = "opacity 160ms"
    el.style.opacity = "0"
    setTimeout(() => {
      el.textContent = val
      el.style.opacity = "1"
    }, 160)
  }

  async function fetchNow() {
    const r = await fetch(API, { cache: "no-store" })
    return r.json() // {locutor, programa, ouvintes}
  }

  async function updateAll() {
    try {
      const d = await fetchNow()
      fadeSet("locutorver", d.locutor || "AutoDJ")
      fadeSet("programaver", d.programa || "Tocando as melhores!")
      fadeSet("unicosver", String(d.ouvintes ?? 0))
      backoff = 2000
    } catch {
      backoff = Math.min(backoff * 2, 60000)
    } finally {
      setTimeout(updateAll, backoff === 2000 ? POLL : backoff)
    }
  }

  // compatível com onclick="atualiza_dados('locutorver','locutor')" etc.
  window.atualiza_dados = async (spanId, field) => {
    try {
      const d = await fetchNow()
      const key = field === "unicos" ? "ouvintes" : field // 'unicos' = ouvintes
      const val =
        key === "ouvintes"
          ? String(d.ouvintes ?? 0)
          : key === "locutor"
            ? d.locutor || "AutoDJ"
            : key === "programa"
              ? d.programa || "Tocando as melhores!"
              : ""
      fadeSet(spanId, val)
    } catch {}
  }

  let backoff = 2000
  updateAll()
})()
