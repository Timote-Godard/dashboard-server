import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import si from 'systeminformation'

const app = new Hono()

// 1. Autoriser ton futur React à appeler cette API
app.use('/api/*', cors())

// 2. Ta route principale
app.get('/api/stats', async (c) => {
  
  // Est-on sur le vrai serveur (Linux) ou en local ?
  const isLinux = process.platform === 'linux'
  
  let cpuTemp, cpuLoad, ramData;

  if (isLinux) {

    const [temp, load, mem] = await Promise.all([
      si.cpuTemperature(),
      si.currentLoad(),
      si.mem()
    ]);
    
    cpuTemp = temp.main;
    cpuLoad = load.currentLoad;
    // On convertit les bytes en GB (1024^3) et on arrondit à 2 décimales
    ramData = {
      used: parseFloat((mem.used / 1024 / 1024 / 1024).toFixed(2)),
      total: parseFloat((mem.total / 1024 / 1024 / 1024).toFixed(2)),
      percent: parseFloat(((mem.used / mem.total) * 100).toFixed(2))
    };

  } else {

    cpuTemp = Math.floor(Math.random() * (55 - 40 + 1) + 40);
    cpuLoad = Math.floor(Math.random() * 30); // 0 à 30%
    ramData = {
      used: 3.4,
      total: 8,
      percent: 42.5
    };
  }

  // On prépare le JSON pour le Dashboard
  return c.json({
    status: 'online',
    cpu: {
      temp: cpuTemp,
      load: cpuLoad,
    },
    ram : ramData,
    timestamp: new Date().toISOString()
  })
})

const port = 8085
console.log(`🚀 Serveur dashboard lancé sur http://localhost:${port}`)

serve({ fetch: app.fetch, port })