'use client';

import { useState, useEffect } from 'react';
import mqtt from 'mqtt';

export default function Home() {
  // --- ESTADOS ---
  const [isLoading, setIsLoading] = useState(true);
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
    // Splash Screen dura 2.5 seg para asegurar que cargue estilo
    setTimeout(() => setIsLoading(false), 2500);

    const mqttClient = mqtt.connect(`wss://${mqttOptions.hostname}:${mqttOptions.port}/mqtt`, mqttOptions);

    mqttClient.on('connect', () => {
      setStatus('Conectado 🟢');
      setClient(mqttClient);
    });

    return () => { if (mqttClient) mqttClient.end(); };
  }, []);

  // --- NOTIFICACIÓN Y NAVEGACIÓN ---
  const triggerToastAndReturn = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    
    // Ocultar toast a los 2s
    setTimeout(() => setShowToast(false), 2000);
    
    // Volver al menú principal a los 1.5s
    setTimeout(() => setCurrentScreen('MAIN'), 1500);
  };

  // --- FUNCIONES DE ENVÍO ---
  
  // Nota: Ahora esta función NO envía, solo actualiza visualmente (para sliders)
  const updateChannelLocal = (idx: number, val: number) => {
    const newChannels = [...channels];
    newChannels[idx] = val;
    setChannels(newChannels);
  };

  // Esta función SÍ envía (se usa en el botón Guardar y en Presets)
  const sendEspectroFinal = (valuesToSend: number[]) => {
    setChannels(valuesToSend); // Actualizamos visualmente por si vino de un preset
    if (client) {
      const payload = {
        ch0: valuesToSend[0], ch1: valuesToSend[1], ch2: valuesToSend[2], 
        ch3: valuesToSend[3], ch4: valuesToSend[4]
      };
      client.publish('planta/cmd/luces', JSON.stringify(payload));
      triggerToastAndReturn("Espectro actualizado ✅");
    }
  };

  const sendAjustes = () => {
    if(client) {
      client.publish('planta/cmd/ajustes', JSON.stringify(ajustes));
      triggerToastAndReturn("Ajustes guardados ✅");
    }
  };
  
  const sendFotoperiodo = () => {
    if(client) {
      client.publish('planta/cmd/fotoperiodo', JSON.stringify(times));
      triggerToastAndReturn("Horarios guardados ✅");
    }
  };

  // --- COMPONENTES VISUALES ---

  const MenuButton = ({ label, icon, onClick, secondary = false }: any) => (
    <button onClick={onClick} className={`menu-btn ${secondary ? 'secondary' : 'primary'}`}>
      <span style={{fontSize: '1.6rem', marginRight: '15px'}}>{icon}</span>
      {label}
    </button>
  );

  // --- RENDERIZADO ---

  const renderSplashScreen = () => (
    <div className="splash-container">
      <div className="splash-content">
        <img src="/lux-logo.png" alt="Lux Logo" className="splash-logo pulse" />
        <h2 style={{marginTop: 20, color: '#fff', fontWeight: 300}}>Cargando sistema...</h2>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="card animate-fade-in">
      <div className="header-logo">
        <h1 className="main-title">LUX HORTICULTURA</h1>
        <p className="sub-title">Sistema de Control Inteligente</p>
      </div>
      
      <img src="/lux-logo.png" alt="Lux Logo" className="dashboard-logo" />

      <div className="status-box">
        <span className="dot"></span> {status}
      </div>

      <div className="menu-grid">
        <MenuButton label="Control de Espectro" icon="💡" onClick={() => setCurrentScreen('ESPECTRO')} />
        <MenuButton label="Fotoperiodo" icon="🕒" onClick={() => setCurrentScreen('FOTO')} />
        <MenuButton label="Ajustes Generales" icon="⚙️" onClick={() => setCurrentScreen('AJUSTES')} secondary />
      </div>
    </div>
  );

  const renderEspectro = () => (
    <div className="card animate-slide-up compact-mode">
      <button className="back-btn" onClick={() => setCurrentScreen('MAIN')}>⬅ Volver</button>
      <h2 className="section-title">💡 Control Espectro</h2>
      
      <div className="preset-scroll">
        {presets.map((preset, idx) => (
          <button key={idx} className="preset-chip" onClick={() => sendEspectroFinal(preset.values)}>
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
              onChange={(e) => updateChannelLocal(idx, parseInt(e.target.value))}
              className="lux-slider"
            />
          </div>
        ))}
      </div>

      {/* Botón Nuevo para Guardar Espectro */}
      <button className="save-btn-large" onClick={() => sendEspectroFinal(channels)}>GUARDAR ESPECTRO</button>
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

      <div className="input-group-large" style={{marginTop: 20}}>
        <label>Tiempo de Progreso (min)</label>
        <input type="number" className="number-input" value={ajustes.progreso} onChange={(e) => setAjustes({...ajustes, progreso: parseInt(e.target.value)})} />
      </div>

      <button className="save-btn-large" onClick={sendAjustes}>GUARDAR AJUSTES</button>
    </div>
  );

  if (isLoading) return renderSplashScreen();

  return (
    <div className="app-container">
      <style jsx global>{`
        body { margin: 0; background-color: #000; font-family: 'Segoe UI', Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
        
        /* SPLASH SCREEN FIXED */
        .splash-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 9999; display: flex; justify-content: center; align-items: center; }
        .splash-content { display: flex; flex-direction: column; align-items: center; }
        .splash-logo { width: 180px; height: auto; display: block; }
        .pulse { animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0% { opacity: 0.6; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.6; transform: scale(0.95); } }

        .app-container { min-height: 100vh; display: flex; justify-content: center; padding: 15px; background: radial-gradient(circle at top, #1a1a1a, #000); box-sizing: border-box; }
        .card { width: 100%; max-width: 400px; display: flex; flex-direction: column; position: relative; }
        
        /* HEADER & DASHBOARD */
        .header-logo { text-align: center; margin-top: 10px; margin-bottom: 15px; }
        .main-title { 
          font-size: 1.8rem; margin: 0; font-weight: 800; letter-spacing: 1px;
          background: linear-gradient(to right, #D500F9, #651FFF); -webkit-background-clip: text; color: transparent;
        }
        .sub-title { color: #ccc; font-size: 1.2rem; margin-top: 5px; font-weight: 300; }
        .dashboard-logo { width: 140px; margin: 0 auto 15px; display: block; }
        
        .status-box { background: #1a1a1a; padding: 8px 16px; border-radius: 20px; display: table; margin: 0 auto 20px; border: 1px solid #333; color: #fff; font-size: 0.9rem; }
        .dot { height: 10px; width: 10px; background-color: #00E676; border-radius: 50%; display: inline-block; margin-right: 6px; box-shadow: 0 0 8px #00E676; }

        /* MENÚ BUTTONS COMPACTOS */
        .menu-grid { display: flex; flex-direction: column; gap: 12px; }
        .menu-btn {
          padding: 18px 20px; border: none; border-radius: 16px; color: white; font-weight: 700; font-size: 1.2rem;
          display: flex; align-items: center; justify-content: start; cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4); transition: transform 0.1s;
        }
        .menu-btn:active { transform: scale(0.98); }
        .menu-btn.primary { background: linear-gradient(135deg, #8E24AA, #D500F9); }
        .menu-btn.secondary { background: #1f1f1f; border: 1px solid #333; }

        /* SECCIONES INTERNAS */
        .section-title { font-size: 2rem; margin-bottom: 20px; color: white; text-shadow: 0 2px 10px rgba(0,0,0,0.8); }
        .back-btn { background: #222; padding: 8px 14px; border-radius: 8px; border: none; color: #aaa; font-size: 0.9rem; margin-bottom: 10px; align-self: flex-start; }

        /* ESPECTRO COMPACTO */
        .compact-mode .slider-group { margin-bottom: 0; }
        .sliders-container { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
        .slider-label { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 1rem; color: #ddd; }
        .lux-slider { -webkit-appearance: none; width: 100%; height: 6px; border-radius: 5px; background: #333; }
        .lux-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #E040FB; border: 2px solid white; box-shadow: 0 0 10px #E040FB; }

        /* PRESETS */
        .preset-scroll { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 10px; margin-bottom: 10px; }
        .preset-chip { background: #1a1a1a; border: 1px solid #E040FB; color: #fff; padding: 10px 18px; border-radius: 20px; white-space: nowrap; font-size: 0.95rem; font-weight: 600; }

        /* INPUTS Y BOTONES GUARDAR */
        .input-container-large { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
        .input-group-large label { display: block; color: #bbb; margin-bottom: 8px; font-size: 1rem; }
        .input-group-large input { 
          width: 100%; padding: 16px; background: #1a1a1a; border: 1px solid #444; border-radius: 10px; 
          color: white; font-size: 1.3rem; box-sizing: border-box; 
        }
        
        .switch-container-large { display: flex; flex-direction: column; gap: 20px; margin-bottom: 20px; }
        .switch-row-large { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #333; font-size: 1.1rem; }
        .switch-large { position: relative; display: inline-block; width: 60px; height: 32px; }
        .switch-large input { opacity: 0; width: 0; height: 0; }
        .slider-switch-large { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; border-radius: 34px; transition: .4s; }
        .slider-switch-large:before { position: absolute; content: ""; height: 24px; width: 24px; left: 4px; bottom: 4px; background-color: white; border-radius: 50%; transition: .4s; }
        input:checked + .slider-switch-large { background-color: #E040FB; }
        input:checked + .slider-switch-large:before { transform: translateX(28px); }

        .save-btn-large {
          margin-top: 10px; width: 100%; padding: 18px; background: linear-gradient(135deg, #D500F9, #651FFF);
          border: none; border-radius: 12px; color: white; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.5px;
          box-shadow: 0 4px 15px rgba(224, 64, 251, 0.3);
        }

        /* TOAST COMPACTO */
        .toast { 
          position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); 
          background: #111; border: 1px solid #E040FB; padding: 10px 20px; border-radius: 30px; 
          color: white; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; 
          white-space: nowrap; z-index: 10000; box-shadow: 0 5px 20px rgba(0,0,0,0.6);
          animation: popUp 0.3s ease-out;
        }
        @keyframes popUp { from { transform: translate(-50%, 50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

        /* ANIMACIONES */
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {currentScreen === 'MAIN' && renderDashboard()}
      {currentScreen === 'ESPECTRO' && renderEspectro()}
      {currentScreen === 'FOTO' && renderFotoperiodo()}
      {currentScreen === 'AJUSTES' && renderAjustes()}

      {showToast && (
        <div className="toast">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
