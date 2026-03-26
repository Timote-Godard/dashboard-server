import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import si from 'systeminformation'
import { MerossService } from './meross.js'
import 'dotenv/config'

const app = new Hono()
const meross = new MerossService()

app.use('/api/*', cors())

app.get('/api/stats', async (c) => {
  const isLinux = process.platform === 'linux'
  
  let cpuTemp, cpuLoad, ramData, storageData;

  

  if (isLinux) { // UNIQUEMENT SI LE PROGRAME EST SUR LE SERVEUR
    const [temp, load, mem, fs] = await Promise.all([
      si.cpuTemperature(),
      si.currentLoad(),
      si.mem(),
      si.fsSize() 
    ]);
    
    // CPU
    cpuTemp = temp.main || 0; 
    cpuLoad = parseFloat(load.currentLoad.toFixed(2));

    // RAM
    ramData = {
      used: parseFloat((mem.used / 1024 ** 3).toFixed(2)),
      total: parseFloat((mem.total / 1024 ** 3).toFixed(2)),
      percent: parseFloat(((mem.active / mem.total) * 100).toFixed(2))
    };

    //STOCKAGE
    const mainDrive = fs.find(drive => drive.mount === '/') || fs[0];
    if (mainDrive) {
      storageData = {
        used: parseFloat((mainDrive.used / 1024 ** 3).toFixed(2)),
        total: parseFloat((mainDrive.size / 1024 ** 3).toFixed(2)),
        percent: parseFloat(mainDrive.use.toFixed(2)) 
      };

    } else {
      storageData = { used: 0, total: 0, percent: 0 };
    }

    

  } else { // PROGRAMME TESTÉ EN LOCAL
    cpuTemp = Math.floor(Math.random() * (55 - 40 + 1) + 40);
    cpuLoad = Math.floor(Math.random() * 30);
    ramData = { used: 3.4, total: 8, percent: 42.5 };
    storageData = { used: 45, total: 256, percent: 17.5 };
  }

  // WATTS
  const watts = await meross.getPowerUsage();

  // RETURN TOUTES LES DATAS
  return c.json({
    status: 'online',
    cpu: {
      temp: cpuTemp,
      load: cpuLoad,
    },
    ram: ramData,
    storage: storageData,
    watts: watts,
    timestamp: new Date().toISOString()
  })
})

const port = 8085
console.log(`Serveur dashboard lancé sur http://localhost:${port}`)

serve({ fetch: app.fetch, port })