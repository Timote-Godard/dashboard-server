import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import si from 'systeminformation'
import { MerossService } from './meross.js' // Ton module local !

const app = new Hono()
const meross = new MerossService()

app.use('/api/*', cors())

app.get('/api/stats', async (c) => {
  const isLinux = process.platform === 'linux'
  
  let cpuTemp, cpuLoad, ramData, storageData;

  if (isLinux) {
    // 🚀 LECTURE RÉELLE DU SERVEUR (En parallèle pour aller plus vite)
    const [temp, load, mem, fs] = await Promise.all([
      si.cpuTemperature(),
      si.currentLoad(),
      si.mem(),
      si.fsSize() // <-- Nouvelle fonction pour le disque !
    ]);
    
    // CPU
    cpuTemp = temp.main || 0; 
    cpuLoad = parseFloat(load.currentLoad.toFixed(2));

    // RAM (Conversion Bytes -> GigaBytes)
    ramData = {
      used: parseFloat((mem.used / 1024 ** 3).toFixed(2)),
      total: parseFloat((mem.total / 1024 ** 3).toFixed(2)),
      percent: parseFloat(((mem.active / mem.total) * 100).toFixed(2))
    };

    // STOCKAGE (On cherche la partition principale "/")
    const mainDrive = fs.find(drive => drive.mount === '/') || fs[0];
    if (mainDrive) {
      storageData = {
        used: parseFloat((mainDrive.used / 1024 ** 3).toFixed(2)),
        total: parseFloat((mainDrive.size / 1024 ** 3).toFixed(2)),
        percent: parseFloat(mainDrive.use.toFixed(2)) // 'use' est déjà en %
      };
    } else {
      storageData = { used: 0, total: 0, percent: 0 };
    }

  } else {
    // 💻 MOCK POUR TON PORTABLE WINDOWS
    cpuTemp = Math.floor(Math.random() * (55 - 40 + 1) + 40);
    cpuLoad = Math.floor(Math.random() * 30);
    ramData = { used: 3.4, total: 8, percent: 42.5 };
    storageData = { used: 45, total: 256, percent: 17.5 };
  }

  // ⚡ LA PRISE MEROSS
  const watts = await meross.getPowerUsage();

  return c.json({
    status: 'online',
    cpu: {
      temp: cpuTemp,
      load: cpuLoad,
    },
    ram: ramData,
    storage: storageData, // <-- On l'ajoute au JSON !
    watts: watts,
    timestamp: new Date().toISOString()
  })
})

const port = 8085
console.log(`🚀 Serveur dashboard lancé sur http://localhost:${port}`)

serve({ fetch: app.fetch, port })