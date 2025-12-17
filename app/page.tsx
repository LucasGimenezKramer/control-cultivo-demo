'use client';

import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

export default function Home() {
  // --- ESTADOS DE LA APP ---
  const [client, setClient] = useState<any>(null);
  const [status, setStatus] = useState('Desconectado 🔴');
  const [currentScreen, setCurrentScreen] = useState('MAIN'); // MAIN, ESPECTRO, FOTO, AJUSTES

  // --- DATOS DEL CULTIVO (Estado Local) ---
  // Canales PWM (0-100%)
  const [channels, setChannels] = useState([0, 0, 0, 0, 0]); 
  const channelNames = ["3000K", "5000K", "660nm", "730nm", "UV"];
  
  // Fotoperiodo
  const [times, setTimes] = useState({
    inicio: "08:00",
    encendido: "16:00",
    apagado: "08:00"
  });

  // Ajustes
  const [ajustes, setAjustes] = useState({
    amanecer: true,
    atardecer: false,
    progreso: 15
  });

  // --- PRESETS (Copiados de tu código Arduino) ---
  const presets = [
    { name: "Germinación", values: [30, 50, 20, 0, 0] },
    { name: "Vegetación", values: [40, 70, 40, 0, 75] },
    { name: "Floración", values: [70, 20, 80, 10, 5] },
    { name: "Maduración", values: [50, 10, 100, 40, 5] }
  ];

  // --- CONEXIÓN MQTT ---
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
    const mqttClient = mqtt.connect(`wss://${mqttOptions.hostname}:${mqttOptions.port}/mqtt`, mqttOptions);

    mqttClient.on('connect', () => {
      setStatus('Conectado 🟢');
      setClient(mqttClient);
      // Suscribirse a actualizaciones del ESP32
      mqttClient.subscribe('planta/status');
    });

    mqttClient.on('message', (topic: string, message: Buffer) => {
      // Aquí recibiremos el estado real del ESP32 en el futuro
      console.log("Recibido:", message.toString());
    });

    return () => { if (mqttClient) mqttClient.end(); };
  }, []);

  // --- FUNCIONES DE ENVÍO ---

  // 1. Enviar cambio de luces (Personalizado o Preset)
  const sendLightCommand = (newValues: number[]) => {
    setChannels(newValues); // Actualizamos visualmente
    if (client) {
      // Convertimos array [50, 100...] a objeto JSON
      const payload = {
        ch0: newValues[0],
        ch1: newValues[1],
        ch2: newValues[2],
        ch3: newValues[3],
        ch4: newValues[4]
      };
      client.publish('planta/cmd/luces', JSON.stringify(payload));
    }
  };

  // 2. Apagar Todo
  const apagarTodo = () => {
    const ceros = [0, 0, 0, 0, 0];
    sendLightCommand(ceros);
  };

  // 3. Enviar Ajustes
  const sendAjustes = () => {
    if(client) {
      client.publish('planta/cmd/ajustes', JSON.stringify(ajustes));
      alert("Ajustes enviados al equipo");
    }
  };
  
  // 4. Enviar Fotoperiodo
  const sendFotoperiodo = () => {
    if(client) {
      client.publish('planta/cmd/fotoperiodo', JSON.stringify(times));
      alert("Horarios enviados al equipo");
    }
  };


  // --- PANTALLAS (RENDERIZADO) ---

  const renderDashboard = () => (
    <div style={styles.card}>
      <h2>🌱 Dashboard</h2>
      <div style={styles.statusBox}>
        <p>Estado WiFi: {status}</p>
        <p>Modo Actual: <strong>MANUAL</strong></p> 
        {/* Esto luego vendrá del ESP32 */}
      </div>

      <div style={styles.gridButtons}>
        <button style={styles.navButton} onClick={() => setCurrentScreen('ESPECTRO')}>
          💡 Espectro
        </button>
        <button style={styles.navButton} onClick={() => setCurrentScreen('FOTO')}>
          🕒 Fotoperiodo
        </button>
        <button style={styles.navButton} onClick={() => setCurrentScreen('AJUSTES')}>
          ⚙️ Ajustes
        </button>
      </div>

      <button style={styles.dangerButton} onClick={apagarTodo}>
        🛑 APAGAR TODO
      </button>
    </div>
  );

  const renderEspectro = () => (
    <div style={styles.card}>
      <button style={styles.backButton} onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2>💡 Control de Espectro</h2>
      
      {/* SECCIÓN PRESETS */}
      <div style={{marginBottom: 20}}>
        <h3>Presets</h3>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center'}}>
          {presets.map((preset, idx) => (
            <button 
              key={idx} 
              style={styles.presetButton}
              onClick={() => sendLightCommand(preset.values)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <hr style={{borderColor: '#444'}}/>

      {/* SECCIÓN PERSONALIZADO */}
      <h3>Personalizado</h3>
      {channels.map((val, idx) => (
        <div key={idx} style={styles.sliderContainer}>
          <label>{channelNames[idx]}: {val}%</label>
          <input 
            type="range" 
            min="0" max="100" 
            value={val}
            onChange={(e) => {
              const newChannels = [...channels];
              newChannels[idx] = parseInt(e.target.value);
              // Optimización: No enviar en cada movimiento para no saturar, 
              // solo actualizamos estado local. En 'onMouseUp' enviamos.
              setChannels(newChannels); 
            }}
            onMouseUp={() => sendLightCommand(channels)} // Enviar al soltar
            onTouchEnd={() => sendLightCommand(channels)} // Para celular
            style={styles.slider}
          />
        </div>
      ))}
    </div>
  );

  const renderFotoperiodo = () => (
    <div style={styles.card}>
      <button style={styles.backButton} onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2>🕒 Fotoperiodo</h2>
      
      <div style={styles.inputGroup}>
        <label>Hora Inicio:</label>
        <input type="time" value={times.inicio} 
          onChange={(e) => setTimes({...times, inicio: e.target.value})} style={styles.input}/>
      </div>
      <div style={styles.inputGroup}>
        <label>Tiempo Encendido (HH:MM):</label>
        <input type="time" value={times.encendido} 
          onChange={(e) => setTimes({...times, encendido: e.target.value})} style={styles.input}/>
      </div>
      <div style={styles.inputGroup}>
        <label>Tiempo Apagado (HH:MM):</label>
        <input type="time" value={times.apagado} 
          onChange={(e) => setTimes({...times, apagado: e.target.value})} style={styles.input}/>
      </div>

      <button style={styles.saveButton} onClick={sendFotoperiodo}>Guardar Cambios</button>
    </div>
  );

  const renderAjustes = () => (
    <div style={styles.card}>
      <button style={styles.backButton} onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2>⚙️ Ajustes</h2>

      <div style={styles.switchRow}>
        <label>Simulación Amanecer</label>
        <input type="checkbox" checked={ajustes.amanecer} 
          onChange={(e) => setAjustes({...ajustes, amanecer: e.target.checked})}/>
      </div>

      <div style={styles.switchRow}>
        <label>Simulación Atardecer</label>
        <input type="checkbox" checked={ajustes.atardecer} 
          onChange={(e) => setAjustes({...ajustes, atardecer: e.target.checked})}/>
      </div>

      <div style={styles.inputGroup}>
        <label>Tiempo Progreso (min):</label>
        <input type="number" value={ajustes.progreso} 
          onChange={(e) => setAjustes({...ajustes, progreso: parseInt(e.target.value)})} 
          style={styles.input}
        />
      </div>

      <button style={styles.saveButton} onClick={sendAjustes}>Guardar Ajustes</button>
    </div>
  );

  return (
    <div style={styles.container}>
      {currentScreen === 'MAIN' && renderDashboard()}
      {currentScreen === 'ESPECTRO' && renderEspectro()}
      {currentScreen === 'FOTO' && renderFotoperiodo()}
      {currentScreen === 'AJUSTES' && renderAjustes()}
    </div>
  );
}

// --- ESTILOS CSS (Básico pero funcional) ---
const styles: any = {
  container: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#121212',
    color: '#eee',
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'start'
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: '20px',
    borderRadius: '15px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
  },
  statusBox: {
    backgroundColor: '#2a2a2a',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center' as const
  },
  gridButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '20px'
  },
  navButton: {
    padding: '20px',
    fontSize: '16px',
    backgroundColor: '#333',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer'
  },
  dangerButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    marginBottom: '10px',
    fontSize: '16px'
  },
  presetButton: {
    padding: '8px 12px',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  sliderContainer: {
    marginBottom: '15px'
  },
  slider: {
    width: '100%',
    cursor: 'pointer'
  },
  inputGroup: {
    marginBottom: '15px',
    display: 'flex',
    flexDirection: 'column' as const
  },
  input: {
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #444',
    backgroundColor: '#333',
    color: 'white',
    marginTop: '5px'
  },
  switchRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    padding: '10px',
    backgroundColor: '#2a2a2a',
    borderRadius: '8px'
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '10px'
  }
};
