// api/meta.js
export const config = { runtime: 'edge' };

const STREAM_BASE = 'https://sonicpanel.oficialserver.com/8342';
const STATUS_ENDPOINTS = [
  `${STREAM_BASE}/status-json.xsl`,
  `${STREAM_BASE}/;status.json`,
  `${STREAM_BASE}/stats?json=1`,
  `${STREAM_BASE}/status.xsl`,
  `${STREAM_BASE}/7.html`,
  `${STREAM_BASE}/stream/status-json.xsl`,
];

const PRIMARY_PLAYER_URL   = process.env.PLAYER_SOURCE_URL || '';
const SECONDARY_PLAYER_URL = process.env.SECONDARY_PLAYER_URL || '';

function clean(s) {
  return (s || '').toString().replace(/\s+/g, ' ').trim();
}

function splitTitle(title) {
  const t = clean(title);
  if (!t) return { programa: '', locutor: '' };
  for (const sep of [' — ', ' - ', ' – ', ' | ']) {
    if (t.includes(sep)) {
      const [a, b] = t.split(sep, 2);
      return { programa: clean(a), locutor: clean(b) };
    }
  }
  return { programa: t, locutor: '' };
}

async function trySonicPanel() {
  for (const url of STATUS_ENDPOINTS) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) continue;
      const ct = (r.headers.get('content-type') || '').toLowerCase();
      const text = await r.text();

      if (ct.includes('application/json') || text.trim().startsWith('{')) {
        const j = JSON.parse(text);
        let ouvintes = 0, programa = '', locutor = '';

        if (j.icestats) {
          const src = Array.isArray(j.icestats.source) ? j.icestats.source[0] : j.icestats.source;
          if (src) {
            const { programa:p, locutor:l } = splitTitle(src.title || '');
            programa = p; locutor = l;
            ouvintes = Number(src.listeners || src.listener || 0);
          }
        } else {
          const { programa:p, locutor:l } = splitTitle(j.songtitle || j.title || '');
          programa = p; locutor = l;
          ouvintes = Number(j.listeners || j.currentlisteners || j.ouvintes || 0);
        }

        return {
          locutor: locutor || 'AutoDJ',
          programa: programa || 'Tocando as melhores!',
          ouvintes: isFinite(ouvintes) ? Number(ouvintes) : 0,
          source: 'sonicpanel'
        };
      }

      if (url.endsWith('/7.html')) {
        const t = text.replace(/(\r?\n)+/g, '\n').trim();
        let title = '';
        const m = t.match(/StreamTitle='([^']+)'/i);
        if (m) title = m[1];
        let ouvintes = 0;
        const ml = t.match(/CurrentListeners=(\d+)/i);
        if (ml) ouvintes = Number(ml[1]);
        const { programa, locutor } = splitTitle(title);
        return { locutor: locutor || 'AutoDJ', programa: programa || 'Tocando as melhores!', ouvintes, source:'7html' };
      }

      if (ct.includes('text/html')) {
        const m = text.match(/Current Song<\/td>\s*<td[^>]*>(.*?)<\/td>/i);
        const title = clean(m ? m[1] : '');
        const { programa, locutor } = splitTitle(title);
        return { locutor: locutor || 'AutoDJ', programa: programa || 'Tocando as melhores!', ouvintes:0, source:'status.xsl' };
      }
    } catch {}
  }
  return null;
}

function pickByIdOrClass(html, names) {
  for (const name of names) {
    let re = new RegExp(`id=["']${name}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
    let m = html.match(re);
    if (m) return clean(m[1].replace(/<[^>]+>/g, ' '));

    re = new RegExp(`class=["'][^"']*\\b${name}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
    m = html.match(re);
    if (m) return clean(m[1].replace(/<[^>]+>/g, ' '));
  }
  return '';
}

function pickLabelled(html, labels) {
  for (const lab of labels) {
    const re = new RegExp(`${lab}\\s*[:\\-]\\s*([^<\\n\\r]+)`, 'i');
    const m = html.match(re);
    if (m) return clean(m[1]);
  }
  return '';
}

function pickFromJSON(html, keys) {
  for (const k of keys) {
    const re = new RegExp(`"${k}"\\s*:\\s*"([^"]+)"`, 'i');
    const m = html.match(re);
    if (m) return clean(m[1]);
  }
  return '';
}

async function scrapePlayer(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return null;
    const html = await r.text();

    let locutor = pickFromJSON(html, ['locutor','dj','speaker','announcer','presenter']);
    let programa = pickFromJSON(html, ['programa','programacao','show','program','title','np']);
    let ouvTxt = pickFromJSON(html, ['ouvintes','listeners','listenersCount','audience']);
    let ouvintes = Number(ouvTxt || 0);

    if (!locutor)   locutor   = pickByIdOrClass(html, ['locutor','dj','current-dj','announcer','presenter','np-dj','dj-name']);
    if (!programa)  programa  = pickByIdOrClass(html, ['programa','programacao','show','np-title','titulo-musica','musica','program-title']);
    if (!ouvintes) {
      const o2 = pickByIdOrClass(html, ['ouvintes','listeners','listeners-count','audience']);
      if (o2) {
        const n = o2.match(/\d+/);
        if (n) ouvintes = Number(n[0]);
      }
    }

    if (!locutor)  locutor  = pickLabelled(html, ['Locutor','DJ','Apresentador','Speaker','Announcer']);
    if (!programa) programa = pickLabelled(html, ['Programa','Programação','Show','Title']);

    if (!programa) {
      const m = html.match(/(Tocando agora|Now Playing|Faixa|Música)\s*[:\-]\s*([^<\n\r]+)/i);
      if (m) programa = clean(m[2]);
    }

    return {
      locutor: locutor || 'AutoDJ',
      programa: programa || 'Tocando as melhores!',
      ouvintes: isFinite(ouvintes) ? ouvintes : 0,
      source: 'scraper'
    };
  } catch {
    return null;
  }
}

export default async function handler() {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, must-revalidate'
  };

  const a = await trySonicPanel();
  if (a) return new Response(JSON.stringify(a), { status: 200, headers });

  const b = await scrapePlayer(PRIMARY_PLAYER_URL);
  if (b) return new Response(JSON.stringify(b), { status: 200, headers });

  const c = await scrapePlayer(SECONDARY_PLAYER_URL);
  if (c) return new Response(JSON.stringify(c), { status: 200, headers });

  return new Response(JSON.stringify({
    locutor: 'AutoDJ',
    programa: 'Tocando as melhores!',
    ouvintes: 0,
    source: 'fallback'
  }), { status: 200, headers });
}
