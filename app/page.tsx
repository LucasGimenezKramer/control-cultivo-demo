'use client';

import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

export default function Home() {
  // --- ESTADOS ---
  const [client, setClient] = useState<any>(null);
  const [status, setStatus] = useState('Desconectado 🔴');
  const [currentScreen, setCurrentScreen] = useState('MAIN');
  const [showToast, setShowToast] = useState(false); // Estado para la notificación flotante
  const [toastMsg, setToastMsg] = useState('');

  // --- DATOS ---
  const [channels, setChannels] = useState([0, 0, 0, 0, 0]); 
  const channelNames = ["3000K", "5000K", "660nm", "730nm", "UV"];
  
  const [times, setTimes] = useState({
    inicio: "08:00",
    encendido: "16:00",
    apagado: "08:00"
  });

  const [ajustes, setAjustes] = useState({
    amanecer: true,
    atardecer: false,
    progreso: 15
  });

  const presets = [
    { name: "🌱 Germinación", values: [30, 50, 20, 0, 0] },
    { name: "🌿 Vegetación", values: [40, 70, 40, 0, 75] },
    { name: "🌸 Floración", values: [70, 20, 80, 10, 5] },
    { name: "🍅 Maduración", values: [50, 10, 100, 40, 5] }
  ];

  // --- MQTT ---
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
    });

    return () => { if (mqttClient) mqttClient.end(); };
  }, []);

  // --- NOTIFICACIÓN FLOTANTE (TOAST) ---
  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // --- FUNCIONES DE ENVÍO ---
  const sendLightCommand = (newValues: number[]) => {
    setChannels(newValues);
    if (client) {
      const payload = {
        ch0: newValues[0], ch1: newValues[1], ch2: newValues[2], ch3: newValues[3], ch4: newValues[4]
      };
      client.publish('planta/cmd/luces', JSON.stringify(payload));
      triggerToast("Luces actualizadas 💡");
    }
  };

  const sendAjustes = () => {
    if(client) {
      client.publish('planta/cmd/ajustes', JSON.stringify(ajustes));
      triggerToast("Ajustes guardados ⚙️");
    }
  };
  
  const sendFotoperiodo = () => {
    if(client) {
      client.publish('planta/cmd/fotoperiodo', JSON.stringify(times));
      triggerToast("Horarios guardados 🕒");
    }
  };

  // --- COMPONENTES VISUALES ---

  // Botón con animación de pulsación
  const MenuButton = ({ label, icon, onClick, secondary = false }: any) => (
    <button 
      onClick={onClick}
      className={`menu-btn ${secondary ? 'secondary' : 'primary'}`}
    >
      <span style={{fontSize: '1.5rem', marginRight: '10px'}}>{icon}</span>
      {label}
    </button>
  );

  const renderDashboard = () => (
    <div className="card animate-fade-in">
      <div className="header-logo">
        <h1 style={{background: 'linear-gradient(to right, #D500F9, #651FFF)', WebkitBackgroundClip: 'text', color: 'transparent'}}>LUX HORTICULTURA</h1>
        <p style={{color: '#aaa', fontSize: '0.9rem'}}>Sistema de Control Inteligente</p>
      </div>
      
      <div className="status-box">
        <div className="status-indicator">
          <span className="dot"></span> {status}
        </div>
      </div>

      <div className="menu-grid">
        <MenuButton label="Control de Espectro" icon="💡" onClick={() => setCurrentScreen('ESPECTRO')} />
        <MenuButton label="Fotoperiodo" icon="🕒" onClick={() => setCurrentScreen('FOTO')} />
        <MenuButton label="Ajustes Generales" icon="⚙️" onClick={() => setCurrentScreen('AJUSTES')} secondary />
      </div>
    </div>
  );

  const renderEspectro = () => (
    <div className="card animate-slide-up">
      <button className="back-btn" onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2 className="section-title">💡 Control Espectro</h2>
      
      <div className="preset-scroll">
        {presets.map((preset, idx) => (
          <button key={idx} className="preset-chip" onClick={() => sendLightCommand(preset.values)}>
            {preset.name}
          </button>
        ))}
      </div>

      <div className="sliders-container">
        {channels.map((val, idx) => (
          <div key={idx} className="slider-group">
            <div className="slider-label">
              <span>{channelNames[idx]}</span>
              <span className="slider-value">{val}%</span>
            </div>
            <input 
              type="range" min="0" max="100" value={val}
              onChange={(e) => {
                const newChannels = [...channels];
                newChannels[idx] = parseInt(e.target.value);
                setChannels(newChannels); 
              }}
              onMouseUp={() => sendLightCommand(channels)}
              onTouchEnd={() => sendLightCommand(channels)}
              className="lux-slider"
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderFotoperiodo = () => (
    <div className="card animate-slide-up">
      <button className="back-btn" onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2 className="section-title">🕒 Fotoperiodo</h2>
      
      <div className="input-container">
        <div className="input-group">
          <label>Inicio de Ciclo</label>
          <input type="time" value={times.inicio} onChange={(e) => setTimes({...times, inicio: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Duración Encendido</label>
          <input type="time" value={times.encendido} onChange={(e) => setTimes({...times, encendido: e.target.value})} />
        </div>
        <div className="input-group">
          <label>Duración Apagado</label>
          <input type="time" value={times.apagado} onChange={(e) => setTimes({...times, apagado: e.target.value})} />
        </div>
      </div>

      <button className="save-btn" onClick={sendFotoperiodo}>GUARDAR HORARIOS</button>
    </div>
  );

  const renderAjustes = () => (
    <div className="card animate-slide-up">
      <button className="back-btn" onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2 className="section-title">⚙️ Ajustes</h2>

      <div className="switch-container">
        <div className="switch-row">
          <label>🌅 Simulación Amanecer</label>
          <label className="switch">
            <input type="checkbox" checked={ajustes.amanecer} onChange={(e) => setAjustes({...ajustes, amanecer: e.target.checked})}/>
            <span className="slider-switch"></span>
          </label>
        </div>
        <div className="switch-row">
          <label>🌇 Simulación Atardecer</label>
          <label className="switch">
            <input type="checkbox" checked={ajustes.atardecer} onChange={(e) => setAjustes({...ajustes, atardecer: e.target.checked})}/>
            <span className="slider-switch"></span>
          </label>
        </div>
      </div>

      <div className="input-group" style={{marginTop: 20}}>
        <label>Tiempo de Progreso (min)</label>
        <input type="number" className="number-input" value={ajustes.progreso} onChange={(e) => setAjustes({...ajustes, progreso: parseInt(e.target.value)})} />
      </div>

      <button className="save-btn" onClick={sendAjustes}>GUARDAR AJUSTES</button>
    </div>
  );

  return (
    <div className="app-container">
      {/* Estilos CSS inyectados */}
      <style jsx global>{`
        body { margin: 0; background-color: #000; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        
        .app-container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(circle at top, #1a1a1a, #000);
          color: white;
        }

        .card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
        }

        .header-logo { text-align: center; margin-bottom: 30px; margin-top: 20px; }
        
        /* Botones del Menú Principal */
        .menu-grid { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
        .menu-btn {
          padding: 25px;
          border: none;
          border-radius: 16px;
          color: white;
          font-weight: bold;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .menu-btn:active { transform: scale(0.96); }
        .menu-btn.primary { background: linear-gradient(135deg, #7B1FA2, #E040FB); }
        .menu-btn.secondary { background: #333; border: 1px solid #444; }

        /* Sliders "Lux" */
        .sliders-container { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; }
        .slider-label { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 500; }
        .slider-value { color: #E040FB; font-weight: bold; }
        
        .lux-slider {
          -webkit-appearance: none; width: 100%; height: 6px; border-radius: 5px; background: #333; outline: none;
        }
        .lux-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; 
          background: #E040FB; cursor: pointer; border: 2px solid white; box-shadow: 0 0 10px #E040FB;
        }

        /* Presets */
        .preset-scroll { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 10px; margin-bottom: 10px; }
        .preset-scroll::-webkit-scrollbar { height: 4px; }
        .preset-scroll::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        .preset-chip {
          background: #222; border: 1px solid #E040FB; color: #fff; padding: 10px 20px;
          border-radius: 20px; white-space: nowrap; cursor: pointer; transition: 0.2s;
        }
        .preset-chip:active { background: #E040FB; color: black; }

        /* Inputs */
        .input-group label { display: block; color: #aaa; margin-bottom: 8px; font-size: 0.9rem; }
        .input-group input {
          width: 100%; padding: 15px; background: #222; border: 1px solid #444;
          border-radius: 10px; color: white; font-size: 1.1rem; box-sizing: border-box;
        }
        .input-group input:focus { border-color: #E040FB; outline: none; }

        /* Botón Guardar */
        .save-btn {
          margin-top: 30px; width: 100%; padding: 18px; background: #E040FB;
          border: none; border-radius: 12px; color: white; font-weight: bold; font-size: 1rem;
          cursor: pointer; box-shadow: 0 0 15px rgba(224, 64, 251, 0.3);
        }
        .save-btn:active { transform: scale(0.98); }

        /* Switches */
        .switch-row { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #333; }
        .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider-switch {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: #333; transition: .4s; border-radius: 34px;
        }
        .slider-switch:before {
          position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px;
          background-color: white; transition: .4s; border-radius: 50%;
        }
        input:checked + .slider-switch { background-color: #E040FB; }
        input:checked + .slider-switch:before { transform: translateX(24px); }

        /* Toast Notification */
        .toast {
          position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
          background: rgba(30, 30, 30, 0.95); border: 1px solid #444; padding: 12px 24px;
          border-radius: 30px; color: white; box-shadow: 0 5px 20px rgba(0,0,0,0.5);
          display: flex; align-items: center; gap: 10px; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 1000;
        }
        @keyframes popIn { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

        /* Utilidades */
        .back-btn { background: none; border: none; color: #888; font-size: 1rem; cursor: pointer; align-self: flex-start; margin-bottom: 10px; }
        .section-title { font-size: 1.8rem; margin-bottom: 20px; background: linear-gradient(to right, #fff, #ccc); WebkitBackgroundClip: 'text'; }
        .status-box { background: #1a1a1a; padding: 8px 15px; border-radius: 20px; display: inline-block; margin: 0 auto 30px; border: 1px solid #333; }
        .dot { height: 10px; width: 10px; background-color: #00E676; border-radius: 50%; display: inline-block; margin-right: 5px; }
      `}</style>

      {currentScreen === 'MAIN' && renderDashboard()}
      {currentScreen === 'ESPECTRO' && renderEspectro()}
      {currentScreen === 'FOTO' && renderFotoperiodo()}
      {currentScreen === 'AJUSTES' && renderAjustes()}

      {/* Notificación flotante */}
      {showToast && (
        <div className="toast">
          <span>✅</span> {toastMsg}
        </div>
      )}
    </div>
  );
}
