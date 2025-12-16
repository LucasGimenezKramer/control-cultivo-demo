'use client';

import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

export default function Home() {
  // CORRECCIÓN 1: Definimos que el cliente puede ser cualquier cosa (<any>)
  const [client, setClient] = useState<any>(null);
  const [status, setStatus] = useState('Desconectado 🔴');
  const [ledState, setLedState] = useState('DESCONOCIDO');

  // CORRECCIÓN 2: Definimos que las opciones son de tipo cualquiera (: any)
  const mqttOptions: any = {
    protocol: 'wss',
    hostname: '7d4a3fafd7334dec89328173dbc10c52.s1.eu.hivemq.cloud',
    port: 8884,
    path: '/mqtt',
    username: 'esp32user',
    password: 'ClaveSuperSegura123',
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
  };

  useEffect(() => {
    console.log('Intentando conectar a HiveMQ...');
    setStatus('Conectando... 🟡');

    const mqttClient = mqtt.connect(`wss://${mqttOptions.hostname}:${mqttOptions.port}/mqtt`, mqttOptions);

    mqttClient.on('connect', () => {
      console.log('¡Conectado a MQTT vía WebSockets!');
      setStatus('Conectado 🟢');
      setClient(mqttClient);
    });

    // CORRECCIÓN 3 (Preventiva): Le decimos que 'err' puede ser cualquier cosa
    mqttClient.on('error', (err: any) => {
      console.error('Error de conexión: ', err);
      setStatus('Error de conexión 🔴');
      mqttClient.end();
    });

    return () => {
      if (mqttClient) mqttClient.end();
    };
  }, []);

  // CORRECCIÓN 4 (Tu error actual): Le decimos explícitamente que 'command' es un STRING
  const toggleLed = (command: string) => {
    if (client) {
      const topic = 'planta/led/control';
      client.publish(topic, command);
      setLedState(command);
      console.log(`Enviado ${command} a ${topic}`);
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      textAlign: 'center', 
      padding: '50px',
      backgroundColor: '#1a1a1a',
      color: 'white',
      minHeight: '100vh'
    }}>
      <h1>🌱 Control de Cultivo IoT perrito</h1>
      
      <div style={{ marginBottom: '20px', fontSize: '1.2rem' }}>
        Estado del Sistema: <strong>{status}</strong>
      </div>

      <div style={{ 
        border: '2px solid #333', 
        padding: '30px', 
        borderRadius: '15px',
        maxWidth: '400px',
        margin: '0 auto',
        backgroundColor: '#2a2a2a'
      }}>
        <h2>Luz LED</h2>
        <p>Estado enviado: <strong>{ledState}</strong></p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
          <button 
            onClick={() => toggleLed('ON')}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ENCENDER
          </button>

          <button 
            onClick={() => toggleLed('OFF')}
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            APAGAR
          </button>
        </div>
      </div>
    </div>
  );
}