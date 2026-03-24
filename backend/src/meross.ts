import crypto from 'crypto';

export class MerossService {
  // Ces infos sont à récupérer via l'app Meross quand tu seras chez toi
  private config = {
    ip: '192.168.1.102', // <-- Remplace par la vraie IP de la prise
    uuid: '***REMOVED***', // L'UUID de "Serveur"
    key: '***REMOVED***', // Ta clé globale
  };

  private isLinux = process.platform === 'linux';

  // Génère la signature de sécurité Meross (MD5)
  private generateSignature(messageId: string, timestamp: number) {
    const data = messageId + this.config.key + timestamp;
    return crypto.createHash('md5').update(data).digest('hex');
  }

  async getPowerUsage(): Promise<number> {
    if (!this.isLinux) {
      // MODE MOCK : On simule pour ton portable
      return parseFloat((Math.random() * (40 - 35) + 35).toFixed(2));
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const messageId = crypto.randomBytes(16).toString('hex');
    const sign = this.generateSignature(messageId, timestamp);

    const payload = {
      header: {
        from: `http://${this.config.ip}/config`,
        messageId: messageId,
        method: 'GET',
        namespace: 'Appliance.Control.Electricity', // Le namespace pour la conso
        payloadVersion: 1,
        sign: sign,
        timestamp: timestamp,
      },
      payload: {},
    };

    try {
      const response = await fetch(`http://${this.config.ip}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000), // Timeout de 3s si la prise est débranchée
      });

      const data = await response.json();
      
      // La puissance est souvent en milliwatts (mW) dans le JSON Meross
      // Il faut diviser par 1000 pour avoir des Watts
      const power = data.payload.electricity.power / 1000;
      return parseFloat(power.toFixed(2));

    } catch (error) {
      console.error("Erreur lecture Meross Local:", error);
      return 0;
    }
  }
}