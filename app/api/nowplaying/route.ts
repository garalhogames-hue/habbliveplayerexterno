import { NextResponse } from "next/server"
export const dynamic = "force-dynamic"

const PANEL_BASE = process.env.PANEL_STATUS_BASE || "https://hlive.ovh/radio/status.php"
const SH_HOST = "sonicpanel.oficialserver.com"
const SH_PORT = 8342

function splitTitle(raw: string) {
  const t = (raw || "").trim()
  if (!t || /autodj|auto dj|radio/i.test(t)) return ["AutoDJ", "Tocando as melhores!"]
  if (t.includes(" - ")) {
    const [a, b] = t.split(" - ", 2)
    return [(a || "AutoDJ").trim(), (b || "Tocando as melhores!").trim()]
  }
  return ["AutoDJ", t]
}

async function txt(url: string) {
  const r = await fetch(url, { cache: "no-store" })
  if (!r.ok) throw new Error(String(r.status))
  return (await r.text()).trim()
}

async function tryPanel() {
  const u = (ver: string) => `${PANEL_BASE}?ver=${encodeURIComponent(ver)}`
  const [locutor, programa, unicos] = await Promise.all([
    txt(u("locutor")).catch(() => ""),
    txt(u("programa")).catch(() => ""),
    txt(u("unicos")).catch(() => ""),
  ])
  const ouvintes = Number(String(unicos).replace(/\D+/g, "")) || 0
  return {
    locutor: locutor || "AutoDJ",
    programa: programa || "Tocando as melhores!",
    ouvintes,
  }
}

async function tryShoutcast() {
  const bases = [`https://${SH_HOST}:${SH_PORT}`, `http://${SH_HOST}:${SH_PORT}`]
  const urls = []
  for (const b of bases) urls.push(`${b}/7.html`, `${b}/7.html?sid=1`)
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: "no-store" })
      if (!r.ok) continue
      const plain = (await r.text()).replace(/<[^>]+>/g, "").trim()
      const p = plain.split(",").map((s) => s.trim())
      if (p.length >= 8 && /^ok/i.test(p[0])) {
        const current = Number(p[1]) || 0
        const unique = Number(p[4]) || 0
        const listeners = unique > 0 ? unique : current
        const title = p[p.length - 1] || ""
        const [locutor, programa] = splitTitle(title)
        return { locutor, programa, ouvintes: listeners }
      }
    } catch {}
  }
  return { locutor: "AutoDJ", programa: "Tocando as melhores!", ouvintes: 0, stale: true }
}

export async function GET() {
  try {
    const data = await tryPanel()
    const res = NextResponse.json(data)
    res.headers.set("Cache-Control", "s-maxage=10, stale-while-revalidate=30")
    res.headers.set("Access-Control-Allow-Origin", "*")
    return res
  } catch {
    const data = await tryShoutcast()
    const res = NextResponse.json(data)
    res.headers.set("Cache-Control", "s-maxage=10, stale-while-revalidate=30")
    res.headers.set("Access-Control-Allow-Origin", "*")
    return res
  }
}
