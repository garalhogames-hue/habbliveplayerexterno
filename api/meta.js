export default async function handler(req, res) {
  try {
    const r = await fetch('https://painel.radiohabb.com/api/metadata');
    const data = await r.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      locutor: data.locutor,
      programa: data.programa,
      ouvintes: data.ouvintes
    });
  } catch (e) {
    res.status(200).json({ locutor: 'AutoDJ', programa: 'Tocando as melhores!', ouvintes: 0 });
  }
}