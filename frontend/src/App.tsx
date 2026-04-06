import { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import StatChart from "./components/StatChart";

// Imports pour la 3D
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Text, useCursor, Html, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';

const VUES_CAMERA = [
  { position: [5.33, 17.67, -0.12], rotation: [-1.57, 0.29, 1.56] }, // 0: Boutons (Ta vue actuelle)
  { position: [23, 17.67, -0.12], rotation: [-1.57, 0.29, 1.56] },    // 1: Commits (Exemple: on décale sur X)
  { position: [44.7, 17.67, -0.12], rotation: [-1.57, 0.29, 1.56] }     // 2: Graphiques (Exemple: encore plus loin sur X)
];

interface GithubCommit {
  projet: string;
  message: string;
  auteur: string;
  date: string;
  hash: string;
  url: string;
}


function CameraController({ vueActive }: { vueActive: number }) {
  useFrame((state) => {
    const vueCible = VUES_CAMERA[vueActive];

    // On fait glisser la position en douceur
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, vueCible.position[0], 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, vueCible.position[1], 0.05);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, vueCible.position[2], 0.05);

    // On fait glisser la rotation en douceur
    state.camera.rotation.x = THREE.MathUtils.lerp(state.camera.rotation.x, vueCible.rotation[0], 0.05);
    state.camera.rotation.y = THREE.MathUtils.lerp(state.camera.rotation.y, vueCible.rotation[1], 0.05);
    state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, vueCible.rotation[2], 0.05);
  });

  return null; // Ce composant n'affiche rien, il pilote juste !
}

// --- COMPOSANT 3D OPTIMISÉ ---
function ModelePlaque() {
  const { nodes } = useGLTF('/plaque.glb') as any;

  const materialPlaque = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#666666', metalness: 0.8, roughness: 0.25 
  }), []);

  // 3. LA CONFIGURATION : Tes 8 boutons avec leurs textes et couleurs "Néon"
  const configurationBoutons = [
    { nom: 'bouton1', texte: 'AGENDA', couleurTexte: '#00ffff', couleurBouton: '#004444', url: 'https://ent-timote.ovh' },
    { nom: 'bouton2', texte: 'CHAMBRE', couleurTexte: '#ff4444', couleurBouton: '#550000', url: 'https://chambre.timote.ovh' },
    { nom: 'bouton3', texte: 'CLOUD', couleurTexte: '#ffbb00', couleurBouton: '#553300', url: 'https://cloud.timote.ovh' },
    { nom: 'bouton4', texte: 'DASHBOARD', couleurTexte: '#00ff00', couleurBouton: '#004400', url: 'https://notes.timote.ovh' },
    { nom: 'bouton5', texte: 'RIEN', couleurTexte: '#aa00ff', couleurBouton: '#220044', url: 'https://dashboard.timote.ovh' },
    { nom: 'bouton6', texte: 'QUIZ', couleurTexte: '#ffffff', couleurBouton: '#444444', url: 'https://quiz.timote.ovh' },
    { nom: 'bouton7', texte: 'PORTFOLIO', couleurTexte: '#0088ff', couleurBouton: '#002255', url: 'https://timote-godard.github.io' },
    { nom: 'bouton8', texte: 'RIEN', couleurTexte: '#ff00aa', couleurBouton: '#550033', url: 'https://dashboard.timote.ovh' }
  ];

    return (
    <group dispose={null} rotation={[0, 0, 0]}>
      {/* LA PLAQUE */}
      <mesh geometry={nodes.plaque.geometry} position={nodes.plaque.position} rotation={nodes.plaque.rotation} material={materialPlaque} />

      {/* LES BOUTONS INTERACTIFS */}
      {configurationBoutons.map((bouton, index) => {
        const node = nodes[bouton.nom];
        if (!node) return null; 

        // On appelle notre usine à boutons magiques !
        return <BoutonInteractif key={index} node={node} bouton={bouton} />;
      })}
    </group>
  );
}

function BoutonInteractif({ node, bouton }: BoutonInteractifProps) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false); // Nouveau : on détecte le clic enfoncé
  const innerGroupRef = useRef<THREE.Group>(null); // Pour animer le bouton

  // Change le curseur au survol
  useCursor(hover);

  // L'ANIMATION OPTIMISÉE (Tourne à chaque image)
  useFrame(() => {
    if (!innerGroupRef.current) return;
    
    // On calcule la profondeur : -0.1 si on clique, -0.05 si on survole, 0 si rien
    const targetY = pressed ? -0.1 : (hover ? -0.5 : 0);
    
    // lerp() permet d'aller d'un point A à un point B de façon ultra-fluide
    innerGroupRef.current.position.y = THREE.MathUtils.lerp(
      innerGroupRef.current.position.y, 
      targetY, 
      0.2 // Vitesse de l'animation (0.1 = lent, 0.5 = très rapide)
    );
  });

  return (
    <group 
      position={node.position}
      // LES ÉVÉNEMENTS SOURIS
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => { setHover(false); setPressed(false); }} // Si on sort, le bouton remonte
      onPointerDown={(e) => { e.stopPropagation(); setPressed(true); }} // On enfonce le clic
      onPointerUp={(e) => { e.stopPropagation(); setPressed(false); }} // On relâche le clic
      onClick={(e) => {
        e.stopPropagation(); 
        window.open(bouton.url, '_blank');
      }}
    >
      {/* Ce groupe interne est celui qui va monter et descendre avec le useRef */}
      <group ref={innerGroupRef}>
        
        {/* LE PLASTIQUE */}
        <mesh geometry={node.geometry} rotation={node.rotation}>
           <meshStandardMaterial color={bouton.couleurBouton} roughness={0.4} metalness={0.2} />
        </mesh>
        
        {/* LE TEXTE */}
        <Text
          position={[0, 0.81, 0]} 
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          fontSize={0.5}
          textAlign="center"
          anchorX="center"
          anchorY="middle"
        >
          {bouton.texte}
          <meshBasicMaterial attach="material" color={bouton.couleurTexte} />
        </Text>

      </group>
    </group>
  );
}

// On précharge le modèle pour que l'affichage soit instantané
useGLTF.preload('/plaque.glb');


// --- INTERFACES ---

interface BoutonConfig {
  texte: string;
  url: string;
  couleurTexte: string;
  couleurBouton: string;
}

// 2. On type les "props" (les paramètres) de ton composant
interface BoutonInteractifProps {
  node: any; // "any" évite de se casser la tête avec les types complexes de Three.js
  bouton: BoutonConfig;
}


interface ChartPointRAM {
  time: string;
  ramUsed: number; 
}

interface ChartPointCPU {
  time: string;
  temp: number;
  load: number;
}

interface ChartPointStorage {
  time: string;
  storageUsed: number;
}

interface ChartPointWatts {
  time: string;
  watts: number;
}

interface EtatService {
  id: string;
  name: string;
  url: string;
  status: string;
  githubRepo: string | null; 
}


// --- APPLICATION PRINCIPALE ---
function App() {
  const [historyCPU, setHistoryCPU] = useState<ChartPointCPU[]>([]);
  const [historyRAM, setHistoryRAM] = useState<ChartPointRAM[]>([]);
  const [historyStorage, setHistoryStorage] = useState<ChartPointStorage[]>([]);
  const [historyWatts, setHistoryWatts] = useState<ChartPointWatts[]>([]);
  const [etatServices, setEtatServices] = useState<EtatService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [githubStatus, setGithubStatus] = useState<any>(null);
  const [moduleActif, setModuleActif] = useState(0);
  const [dpr, setDpr] = useState(1);
  const [commits, setCommits] = useState<GithubCommit[]>([]);

  const allerAuSuivant = () => setModuleActif((prev) => Math.min(prev + 1, 2));
  const allerAuPrecedent = () => setModuleActif((prev) => Math.max(prev - 1, 0));

  const fetchLiveStats = async () => {
    try {
      const res = await fetch('https://api-dashboard.timote.ovh/api/stats');
      if (!res) console.log('pas bon');
      const data = await res.json();
      const time = new Date().toLocaleTimeString();

      setHistoryCPU(prev => [...prev, { time, temp: data.cpu.temp, load: data.cpu.load }].slice(-61));
      setHistoryRAM(prev => [...prev, { time, ramUsed: data.ram.used }].slice(-61));
      setHistoryStorage(prev => [...prev, { time, storageUsed: data.storage.used }].slice(-61));
      setHistoryWatts(prev => [...prev, { time, watts: data.watts }].slice(-61)); 
    } catch (err) {
      console.error("Erreur API :", err);
    }

    try {
      const res = await fetch("https://api-dashboard.timote.ovh/api/services");
      const data = await res.json();
      setEtatServices(data);
    } catch (err) {
      console.error("Erreur API :", err);
    }

    try {
      const resGithub = await fetch("https://api-dashboard.timote.ovh/api/github-status");
      const dataGithub = await resGithub.json();
      setGithubStatus(dataGithub);
    } catch (err) {
      console.error("Erreur API GitHub Status :", err);
    }

    try {
      const resCommits = await fetch('https://api-dashboard.timote.ovh/api/commits');
      const dataCommits = await resCommits.json();
      setCommits(dataCommits);
      console.log("Commits chargés :", dataCommits);
    } catch (err) {
      console.error("Erreur API GitHub Status :", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('https://api-dashboard.timote.ovh/api/history');
      if (!res.ok) return;
      
      const data = await res.json();

      const formatTimestamp = (timestamp: string) => {
        const utcDate = new Date(timestamp.includes('Z') ? timestamp : timestamp + 'Z');
        return utcDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      };

      const formattedCPU = data.map((d: any) => ({ time: formatTimestamp(d.timestamp), temp: d.cpu_temp, load: d.cpu_load }));
      const formattedRAM = data.map((d: any) => ({ time: formatTimestamp(d.timestamp), ramUsed: d.ram_used }));
      const formattedStorage = data.map((d: any) => ({ time: formatTimestamp(d.timestamp), storageUsed: d.storage_used }));
      const formattedWatts = data.map((d: any) => ({ time: formatTimestamp(d.timestamp), watts: d.watts }));

      setHistoryCPU(formattedCPU);
      setHistoryRAM(formattedRAM);
      setHistoryStorage(formattedStorage);
      setHistoryWatts(formattedWatts);
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique :", err);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const demarrerDashboard = async () => {
      await fetchHistory(); 
      await fetchLiveStats(); 
      setIsLoading(false); 
      interval = setInterval(fetchLiveStats, 3000);
    };

    demarrerDashboard();
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold animate-pulse">Initialisation du Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen">
      

      {/* --- MODULE 2 : L'ÉCRAN DE COMMITS --- */}
      {/* On le décale sur X (ex: 30) pour qu'il soit au niveau de ta 2ème vue caméra */}
      
        {/* dpr={[1, 1.5]} bride la résolution pour sauver ton PC */}
        <Canvas dpr={dpr} camera={{ position: [5.30, 17.67, -0.12], rotation: [-1.57, 0.29, 1.56], fov: 45 }}>

          <PerformanceMonitor 
            onDecline={() => setDpr(0.8)} // Mode "Sauvetage" pour vieux PC
            onIncline={() => setDpr(1)} // Mode "HD" pour PC Gamer
          />
          {/* Couleur de fond intégrée à l'UI */}
          <color attach="background" args={['#1f2937']} />

          <ambientLight intensity={0.2} />
          <directionalLight position={[10, 10, 5]} intensity={2} />
          <Environment preset="city" />

          <CameraController vueActive={moduleActif} />

          <Suspense fallback={null}>
              <ModelePlaque />
          </Suspense>
          

          <group position={[16.87, -0.3, 0]}>
        

        {/* L'INCRUSTATION HTML */}
        <Html
          transform    // Applique la perspective 3D
          distanceFactor={8} // Règle la taille du HTML par rapport à la 3D
          position={[0, 0, -6.92]} // Un poil au-dessus du cadre pour éviter le clignotement
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Couché à plat sur la plaque
        >
          {/* TON CODE HTML / REACT CLASSIQUE ICI */}
          <div className="w-[615px] h-[445px] bg-black border-2 border-cyan-900 rounded-lg flex flex-col font-mono text-cyan-400 ">
            
            <div className="flex justify-between border-b border-cyan-900 pb-2 mb-4">
              <span className="text-xs uppercase tracking-widest">System Monitor // Git Log</span>
              <span className="text-xs">v1.0.4</span>
            </div>

             <div className='flex flex-col gap-4 border-1 border-black w-max p-4 rounded-xl mt-5'>
              {etatServices.map((service, key) => {
                const repoData = service.githubRepo ? (githubStatus && githubStatus[service.githubRepo]) || { status: 'idle', conclusion: null, message: 'En attente...' } : null;

                return (
                  <div key={key} className='flex flex-row gap-4 items-center p-2'>
                    <div className={`rounded-xl h-5 w-5 ${service.status === "online" ? 'bg-green-300' : 'bg-red-300'}`}></div>
                    <span className="font-semibold text-lg min-w-[120px]">{service.name}</span>

                    {repoData && (
                      <div className="flex items-center gap-3 bg-gray-800 px-3 py-1 rounded-lg border border-gray-700">
                        {(repoData.status === 'in_progress' || repoData.status === 'queued') ? (
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : repoData.conclusion === 'success' ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">✓</div>
                        ) : repoData.conclusion === 'failure' ? (
                          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">✗</div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold">-</div>
                        )}

                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-200 line-clamp-1 max-w-[200px]">{repoData.message}</span>
                          <span className="text-[10px] text-gray-400">
                            {repoData.status === 'in_progress' ? 'Construction...' : repoData.conclusion === 'success' ? 'En ligne' : repoData.conclusion === 'failure' ? 'Échec' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>

        </Html>

        <Html
          transform    // Applique la perspective 3D
          distanceFactor={8} // Règle la taille du HTML par rapport à la 3D
          position={[0, 0, 6.92]} // Un poil au-dessus du cadre pour éviter le clignotement
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Couché à plat sur la plaque
        >
          {/* TON CODE HTML / REACT CLASSIQUE ICI */}
          <div className="w-[615px] h-[445px] bg-black border-2 border-cyan-900 rounded-lg flex flex-col font-mono text-cyan-400">
            
            <div className="flex justify-between border-b border-cyan-900 pb-2 mb-4">
              <span className="text-xs uppercase tracking-widest">System Monitor // Git Log</span>
              <span className="text-xs">v1.0.4</span>
            </div>
            

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {/* Exemple de liste de commits (à remplacer par tes data GitHub) */}
              {commits.map((c, i) => (
                <div key={i} className="border-l-2 border-cyan-500 pl-4 py-1 mb-2">
                  <div className="text-xs font-bold text-white leading-tight">{c.message}</div>
                  <div className="text-[9px] opacity-70 flex justify-between uppercase">
                    <span>{c.projet} • {new Date(c.date).toLocaleDateString()}</span>
                    <span className="text-cyan-600">#{c.hash}</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
          
        </Html>
          </group>

      <group position={[38.3, 0.6, 0]}>
        

        {/* L'INCRUSTATION HTML */}
        <Html
          transform    // Applique la perspective 3D
          distanceFactor={8} // Règle la taille du HTML par rapport à la 3D
          position={[4.08,0, -6.1]} // Un poil au-dessus du cadre pour éviter le clignotement
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Couché à plat sur la plaque
        >
          {/* TON CODE HTML / REACT CLASSIQUE ICI */}
          <div className="w-[490px] h-[305px] bg-black border-2 border-cyan-900 rounded-lg pointer-events-none will-change-transform flex flex-col font-mono text-cyan-400">
            
            
              {moduleActif >= 2 ? (
              <StatChart title="CPU Performance" data={historyCPU} yDomain={[0, 100]} metrics={[{ key: 'temp', color: '#8884d8', label: 'Température (°C)' }, { key: 'load', color: '#ff4444', label: 'Charge (%)' }]} />
              ) : (
              <div className="text-cyan-900 animate-pulse">Standby...</div>
            )}

          </div>

        </Html>

        <Html
          transform    // Applique la perspective 3D
          distanceFactor={8} // Règle la taille du HTML par rapport à la 3D
          position={[4.08,0, 6.1]} // Un poil au-dessus du cadre pour éviter le clignotement
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Couché à plat sur la plaque
        >
          {/* TON CODE HTML / REACT CLASSIQUE ICI */}
          <div className="w-[490px] h-[305px] bg-black border-2 border-cyan-900 rounded-lg pointer-events-none will-change-transform flex flex-col font-mono text-cyan-400">
            
            
            {moduleActif >= 2 ? (
              <StatChart title="RAM Used" data={historyRAM} yDomain={[0, 16]} metrics={[{ key: 'ramUsed', color: '#00C49F', label: 'Utilisation' }]} />
              ) : (
              <div className="text-cyan-900 animate-pulse">Standby...</div>
            )}

          </div>

        </Html>

        <Html
          transform    // Applique la perspective 3D
          distanceFactor={8} // Règle la taille du HTML par rapport à la 3D
          position={[-3.5,0, -6.1]} // Un poil au-dessus du cadre pour éviter le clignotement
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Couché à plat sur la plaque
        >
          {/* TON CODE HTML / REACT CLASSIQUE ICI */}
          <div className="w-[490px] h-[298px] bg-black border-2 border-cyan-900 rounded-lg pointer-events-none will-change-transform flex flex-col font-mono text-cyan-400">
            
            
            {moduleActif >= 2 ? (
              <StatChart title="Stockage" data={historyStorage} yDomain={[0, 100]} metrics={[{ key: 'storageUsed', color: '#FFBB28', label: 'Go Utilisés' }]} />
              ) : (
              <div className="text-cyan-900 animate-pulse">Standby...</div>
            )}

          </div>

        </Html>

        <Html
          transform    // Applique la perspective 3D
          distanceFactor={8} // Règle la taille du HTML par rapport à la 3D
          position={[-3.5,0, 6.1]} // Un poil au-dessus du cadre pour éviter le clignotement
          rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Couché à plat sur la plaque
        >
          {/* TON CODE HTML / REACT CLASSIQUE ICI */}
          <div className="w-[490px] h-[298px] bg-black border-2 border-cyan-900 rounded-lg pointer-events-none will-change-transform flex flex-col font-mono text-cyan-400">
            
            {moduleActif >= 2 ? (
              <StatChart title="Consommation Électrique" data={historyWatts} yDomain={[0, 'auto']} metrics={[{ key: 'watts', color: '#0088FE', label: 'Watts' }]} />
              ) : (
              <div className="text-cyan-900 animate-pulse">Standby...</div>
            )}

          </div>

        </Html>
      </group>


          

        </Canvas>


          <div className="absolute top-5 right-10 flex flex-col items-center z-[999]">
            {/* On n'affiche le bloc de navigation que si on n'est pas au premier module */}
            {moduleActif > 0 && (
              <button 
                  onClick={allerAuPrecedent} 
                  className="pointer-events-auto text-2xl cursor-pointer hover:bg-white/20 border border-white/10 hover:border-white/20 text-white/20 hover:text-white p-4 rounded-sm transition"
                >
                  {moduleActif === 2 ? "Vers Commits" : "Vers Apps"}
                </button>
            )}
          </div>

          <div className="absolute bottom-5 right-10 flex flex-col items-center z-[999]">
            {/* On n'affiche le bloc de navigation que si on n'est pas au premier module */}
            {moduleActif < 2 && (
              <button 
                  onClick={allerAuSuivant} 
                  className="pointer-events-auto text-2xl cursor-pointer hover:bg-white/20 border border-white/10 hover:border-white/20 text-white/20 hover:text-white p-4 rounded-sm transition"
                >
                  {moduleActif === 1 ? "Vers Dashboard" : "Vers Commits"}
                </button>
            )}
          </div>

        
      </div>
  )
}

export default App;