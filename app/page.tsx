'use client';

import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

export default function Home() {
  // --- ESTADOS ---
  const [isLoading, setIsLoading] = useState(true); // Estado para el Splash Screen
  const [client, setClient] = useState<any>(null);
  const [status, setStatus] = useState('Desconectado 🔴');
  const [currentScreen, setCurrentScreen] = useState('MAIN');
  const [showToast, setShowToast] = useState(false);
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
    // Simular carga de Splash Screen (2 segundos)
    setTimeout(() => setIsLoading(false), 2000);

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

  const MenuButton = ({ label, icon, onClick, secondary = false }: any) => (
    <button onClick={onClick} className={`menu-btn ${secondary ? 'secondary' : 'primary'}`}>
      <span style={{fontSize: '1.8rem', marginRight: '15px'}}>{icon}</span>
      {label}
    </button>
  );

  // --- RENDERIZADO DE PANTALLAS ---

  const renderSplashScreen = () => (
    <div className="splash-screen">
      <img src="/lux-logo.png" alt="Lux Logo" className="splash-logo pulse" />
    </div>
  );

  const renderDashboard = () => (
    <div className="card animate-fade-in">
      <div className="header-logo">
        {/* Títulos más grandes */}
        <h1 className="main-title">LUX HORTICULTURA</h1>
        <p className="sub-title">Sistema de Control Inteligente</p>
      </div>
      
      {/* Logo agregado aquí */}
      <img src="/lux-logo.png" alt="Lux Logo" className="dashboard-logo" />

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
      {/* Título blanco sólido y más grande */}
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
      
      <div className="input-container-large">
        <div className="input-group-large">
          <label>Inicio de Ciclo</label>
          <input type="time" value={times.inicio} onChange={(e) => setTimes({...times, inicio: e.target.value})} />
        </div>
        <div className="input-group-large">
          <label>Duración Encendido</label>
          <input type="time" value={times.encendido} onChange={(e) => setTimes({...times, encendido: e.target.value})} />
        </div>
        <div className="input-group-large">
          <label>Duración Apagado</label>
          <input type="time" value={times.apagado} onChange={(e) => setTimes({...times, apagado: e.target.value})} />
        </div>
      </div>

      <button className="save-btn-large" onClick={sendFotoperiodo}>GUARDAR HORARIOS</button>
    </div>
  );

  const renderAjustes = () => (
    <div className="card animate-slide-up">
      <button className="back-btn" onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2 className="section-title">⚙️ Ajustes</h2>

      <div className="switch-container-large">
        <div className="switch-row-large">
          <label>🌅 Simulación Amanecer</label>
          <label className="switch-large">
            <input type="checkbox" checked={ajustes.amanecer} onChange={(e) => setAjustes({...ajustes, amanecer: e.target.checked})}/>
            <span className="slider-switch-large"></span>
          </label>
        </div>
        <div className="switch-row-large">
          <label>🌇 Simulación Atardecer</label>
          <label className="switch-large">
            <input type="checkbox" checked={ajustes.atardecer} onChange={(e) => setAjustes({...ajustes, atardecer: e.target.checked})}/>
            <span className="slider-switch-large"></span>
          </label>
        </div>
      </div>

      <div className="input-group-large" style={{marginTop: 30}}>
        <label>Tiempo de Progreso (min)</label>
        <input type="number" className="number-input" value={ajustes.progreso} onChange={(e) => setAjustes({...ajustes, progreso: parseInt(e.target.value)})} />
      </div>

      <button className="save-btn-large" onClick={sendAjustes}>GUARDAR AJUSTES</button>
    </div>
  );

  // Si está cargando, mostramos el Splash Screen
  if (isLoading) return renderSplashScreen();

  return (
    <div className="app-container">
      {/* Estilos CSS inyectados */}
      <style jsx global>{`
        body { margin: 0; background-color: #000; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-tap-highlight-color: transparent; }
        
        /* SPLASH SCREEN */
        .splash-screen { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #000; display: flex; justify-content: center; align-items: center; z-index: 9999; }
        .splash-logo { width: 150px; }
        .pulse { animation: pulse-animation 2s infinite; }
        @keyframes pulse-animation { 0% { transform: scale(0.95); opacity: 0.7; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.7; } }

        .app-container {
          min-height: 100vh; display: flex; justify-content: center; padding: 20px;
          background: radial-gradient(circle at top, #1a1a1a, #000); color: white;
          box-sizing: border-box;
        }
        .card { width: 100%; max-width: 400px; display: flex; flex-direction: column; }

        /* HEADER Y LOGO DASHBOARD */
        .header-logo { text-align: center; margin-bottom: 20px; margin-top: 10px; }
        .main-title { 
          font-size: 2.2rem; margin: 0; 
          background: linear-gradient(to right, #D500F9, #651FFF); WebkitBackgroundClip: 'text'; color: 'transparent';
          text-transform: uppercase; letter-spacing: 1px;
        }
        .sub-title { color: #ccc; font-size: 1.1rem; margin-top: 5px; }
        .dashboard-logo { width: 120px; margin: 10px auto 20px; display: block; }
        
        /* BOTONES MENÚ PRINCIPAL */
        .menu-grid { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; flex-grow: 1; justify-content: center; }
        .menu-btn {
          padding: 30px 20px; border: none; border-radius: 18px; color: white; font-weight: bold; font-size: 1.3rem;
          display: flex; align-items: center; justify-content: start; cursor: pointer;
          transition: transform 0.1s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        .menu-btn:active { transform: scale(0.97); }
        .menu-btn.primary { background: linear-gradient(135deg, #8E24AA, #D500F9); }
        .menu-btn.secondary { background: #2c2c2c; border: 2px solid #444; color: #eee; }

        /* TÍTULOS DE SECCIÓN (Corregido contraste) */
        .section-title { 
          font-size: 2.2rem; margin-bottom: 25px; color: #ffffff; font-weight: 800;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        }

        /* SLIDERS LUX */
        .sliders-container { display: flex; flex-direction: column; gap: 25px; margin-top: 30px; }
        .slider-label { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: 500; font-size: 1.1rem; }
        .slider-value { color: #E040FB; font-weight: bold; }
        .lux-slider { -webkit-appearance: none; width: 100%; height: 8px; border-radius: 5px; background: #333; outline: none; }
        .lux-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #E040FB; cursor: pointer; border: 3px solid white; box-shadow: 0 0 15px #E040FB; }

        /* PRESETS */
        .preset-scroll { display: flex; overflow-x: auto; gap: 12px; padding-bottom: 15px; margin-bottom: 10px; }
        .preset-chip { background: #222; border: 2px solid #E040FB; color: #fff; padding: 12px 24px; border-radius: 25px; white-space: nowrap; font-size: 1rem; font-weight: bold; }

        /* INPUTS y SWITCHES GRANDES (Fotoperiodo y Ajustes) */
        .input-container-large { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; flex-grow: 1; }
        .input-group-large label { display: block; color: #ccc; margin-bottom: 10px; font-size: 1.1rem; }
        .input-group-large input {
          width: 100%; padding: 20px; background: #222; border: 2px solid #444;
          border-radius: 12px; color: white; font-size: 1.4rem; box-sizing: border-box;
        }
        .input-group-large input:focus { border-color: #E040FB; }

        .switch-container-large { display: flex; flex-direction: column; gap: 25px; margin-top: 30px; }
        .switch-row-large { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 2px solid #333; font-size: 1.3rem; }
        
        .switch-large { position: relative; display: inline-block; width: 70px; height: 36px; }
        .switch-large input { opacity: 0; width: 0; height: 0; }
        .slider-switch-large { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 36px; }
        .slider-switch-large:before { position: absolute; content: ""; height: 28px; width: 28px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider-switch-large { background-color: #E040FB; }
        input:checked + .slider-switch-large:before { transform: translateX(34px); }

        /* BOTONES GUARDAR GRANDES */
        .save-btn-large {
          margin-top: auto; width: 100%; padding: 22px; background: linear-gradient(135deg, #D500F9, #651FFF);
          border: none; border-radius: 15px; color: white; font-weight: 900; font-size: 1.3rem; letter-spacing: 1px;
          cursor: pointer; box-shadow: 0 5px 20px rgba(224, 64, 251, 0.4);
        }
        .save-btn-large:active { transform: scale(0.98); }

        /* UTILIDADES Y TOAST */
        .back-btn { background: #333; padding: 10px 15px; border-radius: 20px; border: none; color: #fff; font-size: 1rem; margin-bottom: 20px; align-self: flex-start; }
        .status-box { background: #1a1a1a; padding: 10px 20px; border-radius: 30px; display: inline-block; margin: 0 auto 25px; border: 2px solid #333; font-size: 0.9rem; }
        .dot { height: 12px; width: 12px; background-color: #00E676; border-radius: 50%; display: inline-block; margin-right: 8px; box-shadow: 0 0 10px #00E676; }
        .toast { position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%); background: #1e1e1e; border: 2px solid #E040FB; padding: 15px 30px; border-radius: 40px; color: white; font-weight: bold; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 12px; font-size: 1.1rem; z-index: 10000; animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes popIn { from { transform: translate(-50%, 100%) scale(0.5); opacity: 0; } to { transform: translate(-50%, 0) scale(1); opacity: 1; } }
        
        /* ANIMACIONES DE PANTALLA */
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        .animate-slide-up { animation: slideUp 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Componente a renderizar según estado */}
      {currentScreen === 'MAIN' && renderDashboard()}
      {currentScreen === 'ESPECTRO' && renderEspectro()}
      {currentScreen === 'FOTO' && renderFotoperiodo()}
      {currentScreen === 'AJUSTES' && renderAjustes()}

      {/* Notificación flotante */}
      {showToast && (
        <div className="toast">
          <span style={{fontSize: '1.5rem'}}>✅</span> {toastMsg}
        </div>
      )}
    </div>
  );
}
