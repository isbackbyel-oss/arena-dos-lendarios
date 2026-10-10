import * as THREE from 'three';

window.__arenaOk = true;
const $ = (id) => document.getElementById(id);

/* ============ ESTADO ============ */
let estado = 'carregando'; // carregando | menu | jogo | pausa | fim
let tempoRestante = 90;
let moedas = 0;
try { moedas = parseInt(localStorage.getItem('arena_moedas') || '0', 10) || 0; } catch (e) {}

/* ============ RENDERER / CENA ============ */
const canvas = $('cena');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fd4ff, 35, 110);

// céu em degradê
{
  const c = document.createElement('canvas'); c.width = 2; c.height = 256;
  const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#3d8bff'); gr.addColorStop(0.6, '#8fd0ff'); gr.addColorStop(1, '#e8f6ff');
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  scene.background = new THREE.CanvasTexture(c);
}

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 250);

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 1.0));
const sol = new THREE.DirectionalLight(0xfff1d0, 1.9);
sol.position.set(10, 18, 8);
sol.castShadow = true;
sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 50 });
scene.add(sol);

const mat = (cor, extra = {}) => new THREE.MeshLambertMaterial({ color: cor, ...extra });
const chamas = [];

/* ============ ARENA ============ */
function construirArena() {
  // plataforma
  const base = new THREE.Mesh(new THREE.CylinderGeometry(15, 13, 2, 40), mat(0x6f6a78));
  base.position.y = -1.01; base.receiveShadow = true; scene.add(base);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(14.6, 48), mat(0xc2ad8c));
  piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; scene.add(piso);
  for (const [r1, r2, cor] of [[4.6, 5.0, 0x8d7a5c], [8.6, 8.9, 0x8d7a5c], [13.6, 14.3, 0x7d6c52]]) {
    const anel = new THREE.Mesh(new THREE.RingGeometry(r1, r2, 64), mat(cor));
    anel.rotation.x = -Math.PI / 2; anel.position.y = 0.01; scene.add(anel);
  }
  // pilares com fogo
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = Math.cos(a) * 13.4, z = Math.sin(a) * 13.4;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.2, 1.3), mat(0x7c7886));
    p.position.set(x, 1.6, z); p.castShadow = true; p.receiveShadow = true; scene.add(p);
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.55, 0.45, 10), mat(0x4a4655));
    topo.position.set(x, 3.4, z); scene.add(topo);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), new THREE.MeshBasicMaterial({ color: 0xff8a1f }));
    f.position.set(x, 4.2, z); scene.add(f); chamas.push(f);
  }
  // faixas (azul e vermelha)
  for (const [ang, cor] of [[Math.PI / 2 + 0.55, 0xd8322e], [Math.PI / 2 - 0.55, 0x2f6fe0], [-Math.PI / 2 + 0.55, 0x2f6fe0], [-Math.PI / 2 - 0.55, 0xd8322e]]) {
    const g = new THREE.Group();
    const poste = new THREE.Mesh(new THREE.BoxGeometry(0.2, 5, 0.2), mat(0x5a3d22)); poste.position.y = 2.5; g.add(poste);
    const pano = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 0.06), mat(cor)); pano.position.set(0, 3.2, 0); g.add(pano);
    const emb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08), mat(0xffe08a)); emb.position.set(0, 3.5, 0.02); g.add(emb);
    g.position.set(Math.cos(ang) * 15.5, 0, Math.sin(ang) * 15.5);
    g.lookAt(0, 0, 0); scene.add(g);
  }
  // portal azul ao fundo
  const portal = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.28, 12, 40), new THREE.MeshBasicMaterial({ color: 0x4cc9ff }));
  portal.position.set(0, 3.2, -17); scene.add(portal);
  const veu = new THREE.Mesh(new THREE.CircleGeometry(2.45, 32), new THREE.MeshBasicMaterial({ color: 0x9be8ff, transparent: true, opacity: 0.35 }));
  veu.position.set(0, 3.2, -17); scene.add(veu);

  // ilhas flutuantes
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, r = 26 + rnd() * 34;
    const w = 4 + rnd() * 7, h = 2 + rnd() * 3, y = -4 + rnd() * 12;
    const g = new THREE.Group();
    const rocha = new THREE.Mesh(new THREE.CylinderGeometry(w, w * 0.45, h, 7), mat(0x7a6a5a)); g.add(rocha);
    const grama = new THREE.Mesh(new THREE.CylinderGeometry(w, w, 0.5, 7), mat(0x58c24a)); grama.position.y = h / 2; g.add(grama);
    if (rnd() > 0.4) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), mat(0x6b4524)); tr.position.set(0, h / 2 + 1, 0); g.add(tr);
      const co = new THREE.Mesh(new THREE.BoxGeometry(2, 1.8, 2), mat(0x3fa13a)); co.position.set(0, h / 2 + 2.3, 0); g.add(co);
    }
    g.position.set(Math.cos(a) * r, y, Math.sin(a) * r); scene.add(g);
  }
}

/* ============ LUTADORES (estilo bloco) ============ */
function criarLutador({ pele, camisa, calca, lenco, cabelo, nome }) {
  const grupo = new THREE.Group();
  const mats = [];
  const m = (c) => { const x = mat(c, { emissive: 0x000000 }); mats.push(x); return x; };
  const caixa = (w, h, d, material, x, y, z, pai = grupo) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    me.position.set(x, y, z); me.castShadow = true; pai.add(me); return me;
  };
  const pivo = (x, y) => { const p = new THREE.Group(); p.position.set(x, y, 0); grupo.add(p); return p; };

  const pernaE = pivo(-0.22, 0.8), pernaD = pivo(0.22, 0.8);
  caixa(0.42, 0.8, 0.42, m(calca), 0, -0.4, 0, pernaE); caixa(0.42, 0.8, 0.42, m(calca), 0, -0.4, 0, pernaD);
  caixa(0.46, 0.2, 0.55, m(0x1a1a22), 0, -0.72, 0.06, pernaE); caixa(0.46, 0.2, 0.55, m(0x1a1a22), 0, -0.72, 0.06, pernaD);
  caixa(0.95, 0.9, 0.5, m(camisa), 0, 1.25, 0);
  caixa(1.0, 0.16, 0.54, m(0x222a3a), 0, 0.9, 0);
  const bracoE = pivo(-0.66, 1.65), bracoD = pivo(0.66, 1.65);
  for (const b of [bracoE, bracoD]) {
    caixa(0.36, 0.85, 0.36, m(camisa), 0, -0.38, 0, b);
    caixa(0.4, 0.3, 0.4, m(0x1a1a22), 0, -0.82, 0, b);
  }
  caixa(1.0, 0.22, 0.6, m(lenco), 0, 1.72, 0);
  caixa(0.72, 0.72, 0.72, m(pele), 0, 2.15, 0);
  caixa(0.78, 0.3, 0.78, m(cabelo), 0, 2.45, -0.02);
  for (const sx of [-0.28, -0.05, 0.2]) caixa(0.2, 0.28, 0.2, m(cabelo), sx, 2.68, 0.05);
  const olho = new THREE.MeshBasicMaterial({ color: 0x14213d });
  caixa(0.12, 0.14, 0.04, olho, -0.17, 2.18, 0.37); caixa(0.12, 0.14, 0.04, olho, 0.17, 2.18, 0.37);

  scene.add(grupo);
  return {
    nome, grupo, mats, pernaE, pernaD, bracoE, bracoD,
    pos: grupo.position, vida: 100, atkT: 0, cdAtk: 0, cdPoder: 0, hitFeito: true,
    flash: 0, andando: 0, empurrao: new THREE.Vector3(), cdIA: 1, cdPoderIA: 3
  };
}

let jogador, inimigo;

/* ============ EFEITOS ============ */
const bolas = [];
const faiscas = [];
const geoFaisca = new THREE.SphereGeometry(0.1, 6, 6);

function soltarFaiscas(p, cor, n = 10) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geoFaisca, new THREE.MeshBasicMaterial({ color: cor, transparent: true }));
    m.position.copy(p);
    const v = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4 + 1, (Math.random() - 0.5) * 5);
    faiscas.push({ m, v, vida: 0.5 }); scene.add(m);
  }
}

function lancarPoder(dono, alvo, dano, cor) {
  const dir = new THREE.Vector3().subVectors(alvo.pos, dono.pos).setY(0).normalize();
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), new THREE.MeshBasicMaterial({ color: cor }));
  m.position.copy(dono.pos).addScaledVector(dir, 1.2).setY(1.4);
  scene.add(m);
  bolas.push({ m, dir, alvo, dano, cor, vida: 2, dono });
}

/* ============ COMBATE ============ */
function dano(alvo, qtd, de, cor = 0xffd34a) {
  if (estado !== 'jogo') return;
  alvo.vida = Math.max(0, alvo.vida - qtd);
  alvo.flash = 0.15;
  const dir = new THREE.Vector3().subVectors(alvo.pos, de.pos).setY(0).normalize();
  alvo.empurrao.copy(dir).multiplyScalar(qtd > 12 ? 7 : 4);
  soltarFaiscas(new THREE.Vector3(alvo.pos.x, 1.5, alvo.pos.z), cor);
  atualizarHUD();
  if (alvo.vida <= 0) terminar(alvo === inimigo);
}

function atacar(f) {
  if (f.atkT > 0 || f.cdAtk > 0) return false;
  f.atkT = 0.35; f.cdAtk = 0.5; f.hitFeito = false; return true;
}

function usarPoder(f, alvo, cor) {
  if (f.cdPoder > 0) return false;
  f.cdPoder = 3; f.atkT = 0.35; f.hitFeito = true;
  lancarPoder(f, alvo, f === jogador ? 20 : 12, cor);
  return true;
}

function atualizarLutador(f, alvo, dt) {
  // virar para o alvo
  const dx = alvo.pos.x - f.pos.x, dz = alvo.pos.z - f.pos.z;
  f.grupo.rotation.y = Math.atan2(dx, dz);
  f.cdAtk = Math.max(0, f.cdAtk - dt);
  f.cdPoder = Math.max(0, f.cdPoder - dt);
  // empurrão
  f.pos.addScaledVector(f.empurrao, dt);
  f.empurrao.multiplyScalar(Math.max(0, 1 - 9 * dt));
  // animação de soco
  let ang = 0;
  if (f.atkT > 0) {
    const t = 1 - f.atkT / 0.35;
    ang = -Math.PI / 2 * Math.sin(Math.min(1, t) * Math.PI);
    if (!f.hitFeito && t > 0.45) {
      f.hitFeito = true;
      const d = Math.hypot(dx, dz);
      if (d < 2.4) dano(alvo, f === jogador ? 10 : 6, f);
    }
    f.atkT = Math.max(0, f.atkT - dt);
  }
  f.bracoD.rotation.x = ang;
  // caminhar
  f.andando = Math.max(0, f.andando - dt * 4);
  const balanco = Math.sin(performance.now() * 0.014) * 0.7 * Math.min(1, f.andando);
  f.pernaE.rotation.x = balanco; f.pernaD.rotation.x = -balanco;
  f.bracoE.rotation.x = -balanco * 0.8;
  if (f.atkT <= 0) f.bracoD.rotation.x = balanco * 0.8;
  // piscada de dano
  f.flash = Math.max(0, f.flash - dt);
  const e = f.flash > 0 ? 0.8 : 0;
  for (const m of f.mats) m.emissive.setRGB(e, e * 0.1, 0);
  // limite da arena
  const r = Math.hypot(f.pos.x, f.pos.z);
  if (r > 12.5) { f.pos.x *= 12.5 / r; f.pos.z *= 12.5 / r; }
}

function mover(f, dx, dz, vel, dt) {
  const len = Math.hypot(dx, dz);
  if (len < 0.05) return;
  const k = Math.min(1, len);
  f.pos.x += (dx / len) * vel * k * dt;
  f.pos.z += (dz / len) * vel * k * dt;
  f.andando = 1;
}

/* ============ ENTRADAS ============ */
const joy = { x: 0, y: 0, id: null };
const teclas = {};
const joyEl = $('joy'), knob = $('joy-knob');

function joyMover(e) {
  const r = joyEl.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2, raio = r.width / 2;
  let dx = (e.clientX - cx) / raio, dy = (e.clientY - cy) / raio;
  const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  joy.x = dx; joy.y = dy;
  knob.style.transform = `translate(${dx * raio * 0.55}px, ${dy * raio * 0.55}px)`;
}
joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); joyMover(e); });
joyEl.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) joyMover(e); });
const joySoltar = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
joyEl.addEventListener('pointerup', joySoltar);
joyEl.addEventListener('pointercancel', joySoltar);

$('b-ataque').addEventListener('pointerdown', (e) => { e.preventDefault(); if (estado === 'jogo') atacar(jogador); });
$('b-poder').addEventListener('pointerdown', (e) => { e.preventDefault(); if (estado === 'jogo') usarPoder(jogador, inimigo, 0xff7a1a); });

window.addEventListener('keydown', (e) => {
  teclas[e.code] = true;
  if (estado !== 'jogo') return;
  if (e.code === 'KeyJ' || e.code === 'Space') atacar(jogador);
  if (e.code === 'KeyK') usarPoder(jogador, inimigo, 0xff7a1a);
  if (e.code === 'Escape') pausar();
});
window.addEventListener('keyup', (e) => { teclas[e.code] = false; });

/* ============ TELAS ============ */
function mostrar(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.remove('ativa'));
  $(id).classList.add('ativa');
}
function atualizarMoedas() { $('moedas-menu').textContent = moedas; }

function atualizarHUD() {
  $('vida-j').style.width = jogador.vida + '%';
  $('vida-i').style.width = inimigo.vida + '%';
}

function irMenu() {
  estado = 'menu';
  limparEfeitos();
  jogador.pos.set(-1.3, 0, 0); inimigo.pos.set(1.3, 0, 0);
  jogador.grupo.rotation.y = 0.6; inimigo.grupo.rotation.y = -0.6;
  jogador.vida = inimigo.vida = 100;
  atualizarMoedas();
  mostrar('tela-menu');
}

function iniciarLuta() {
  limparEfeitos();
  jogador.pos.set(0, 0, 6); inimigo.pos.set(0, 0, -6);
  for (const f of [jogador, inimigo]) { f.vida = 100; f.atkT = 0; f.cdAtk = 0; f.cdPoder = 0; f.empurrao.set(0, 0, 0); f.flash = 0; }
  inimigo.cdIA = 1.5; inimigo.cdPoderIA = 4;
  tempoRestante = 90;
  atualizarHUD();
  $('tempo').textContent = '01:30';
  estado = 'jogo';
  mostrar('tela-jogo');
}

function limparEfeitos() {
  for (const b of bolas) scene.remove(b.m); bolas.length = 0;
  for (const s of faiscas) scene.remove(s.m); faiscas.length = 0;
}

function pausar() { if (estado === 'jogo') { estado = 'pausa'; mostrar('tela-pausa'); } }
function continuar() { if (estado === 'pausa') { estado = 'jogo'; mostrar('tela-jogo'); } }

function terminar(venceu) {
  estado = 'fim';
  const ganho = venceu ? 100 : 20;
  moedas += ganho;
  try { localStorage.setItem('arena_moedas', String(moedas)); } catch (e) {}
  const t = $('fim-titulo');
  t.textContent = venceu ? 'Vitória' : 'Derrota';
  t.classList.toggle('derrota', !venceu);
  $('fim-txt').textContent = `+${ganho} moedas • Total: ${moedas}`;
  mostrar('tela-fim');
}

function breve(titulo, txt) {
  $('breve-titulo').textContent = titulo; $('breve-txt').textContent = txt;
  mostrar('tela-breve');
}

async function tentarTelaCheia() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch (e) { /* sem problema: o aviso de girar o celular continua funcionando */ }
}

$('b-jogar').onclick = () => { tentarTelaCheia(); iniciarLuta(); };
$('b-loja').onclick = () => breve('Loja', 'A loja de personagens, skins e emotes chega na próxima etapa.');
$('b-config').onclick = () => breve('Configurações', 'Som, qualidade gráfica e controles chegam na próxima etapa.');
$('b-sair').onclick = () => breve('Sair', 'Para sair, feche a aba ou volte para a tela inicial do celular.');
$('b-breve-ok').onclick = () => mostrar('tela-menu');
$('b-pausa').onclick = pausar;
$('b-continuar').onclick = continuar;
$('b-reiniciar').onclick = iniciarLuta;
$('b-menu-pausa').onclick = irMenu;
$('b-de-novo').onclick = iniciarLuta;
$('b-menu-fim').onclick = irMenu;

/* ============ CÂMERA ============ */
const camPos = new THREE.Vector3(0, 4, 14), camAlvo = new THREE.Vector3(0, 1.5, 0);

function atualizarCamera(dt) {
  let pDesejada, aDesejado;
  if (estado === 'menu' || estado === 'carregando') {
    const t = performance.now() * 0.0002;
    pDesejada = new THREE.Vector3(Math.sin(t) * 3.2, 1.9, 6.2);
    aDesejado = new THREE.Vector3(0, 1.6, 0);
  } else {
    const dir = new THREE.Vector3().subVectors(inimigo.pos, jogador.pos).setY(0).normalize();
    pDesejada = jogador.pos.clone().addScaledVector(dir, -6.5).add(new THREE.Vector3(0, 3.6, 0));
    aDesejado = jogador.pos.clone().addScaledVector(dir, 3.5).add(new THREE.Vector3(0, 1.3, 0));
  }
  const k = 1 - Math.exp(-6 * dt);
  camPos.lerp(pDesejada, k); camAlvo.lerp(aDesejado, k);
  camera.position.copy(camPos); camera.lookAt(camAlvo);
}

/* ============ LOOP ============ */
const relogio = new THREE.Clock();

function atualizarJogo(dt) {
  // jogador: o "para frente" é em direção ao oponente
  const f = new THREE.Vector3().subVectors(inimigo.pos, jogador.pos).setY(0).normalize();
  const dir = new THREE.Vector3(-f.z, 0, f.x); // direita da câmera
  let ix = joy.x, iy = joy.y;
  if (teclas.KeyA || teclas.ArrowLeft) ix -= 1;
  if (teclas.KeyD || teclas.ArrowRight) ix += 1;
  if (teclas.KeyW || teclas.ArrowUp) iy -= 1;
  if (teclas.KeyS || teclas.ArrowDown) iy += 1;
  mover(jogador, dir.x * ix + f.x * -iy, dir.z * ix + f.z * -iy, 5, dt);
  // evita atravessar o oponente
  const sep = Math.hypot(jogador.pos.x - inimigo.pos.x, jogador.pos.z - inimigo.pos.z);
  if (sep < 1.1) {
    const n = new THREE.Vector3().subVectors(jogador.pos, inimigo.pos).setY(0).normalize();
    jogador.pos.addScaledVector(n, 1.1 - sep);
  }

  // robô simples (ainda não é multiplayer)
  const d = sep;
  if (d > 2.0) {
    const v = new THREE.Vector3().subVectors(jogador.pos, inimigo.pos).setY(0).normalize();
    mover(inimigo, v.x, v.z, 3.0, dt);
  }
  inimigo.cdIA -= dt; inimigo.cdPoderIA -= dt;
  if (d <= 2.2 && inimigo.cdIA <= 0) { if (atacar(inimigo)) inimigo.cdIA = 1.2 + Math.random() * 0.6; }
  if (d > 5 && inimigo.cdPoderIA <= 0) { usarPoder(inimigo, jogador, 0x3ab8ff); inimigo.cdPoderIA = 4 + Math.random() * 2; }

  atualizarLutador(jogador, inimigo, dt);
  atualizarLutador(inimigo, jogador, dt);

  // bolas de poder
  for (let i = bolas.length - 1; i >= 0; i--) {
    const b = bolas[i];
    b.m.position.addScaledVector(b.dir, 14 * dt);
    b.vida -= dt;
    const dd = Math.hypot(b.m.position.x - b.alvo.pos.x, b.m.position.z - b.alvo.pos.z);
    if (dd < 1.0) { dano(b.alvo, b.dano, b.dono, b.cor); b.vida = 0; }
    if (b.vida <= 0) { scene.remove(b.m); bolas.splice(i, 1); }
  }

  // tempo
  tempoRestante -= dt;
  if (tempoRestante <= 0) { terminar(jogador.vida >= inimigo.vida); return; }
  const t = Math.ceil(tempoRestante);
  $('tempo').textContent = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');

  // recarga do poder
  $('cd-poder').style.height = (jogador.cdPoder / 3) * 100 + '%';
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(relogio.getDelta(), 0.05);
  if (estado === 'jogo') atualizarJogo(dt);
  else if (estado === 'menu') {
    // lutadores respiram no menu
    const t = performance.now() * 0.002;
    jogador.grupo.position.y = Math.sin(t) * 0.03; inimigo.grupo.position.y = Math.sin(t + 1) * 0.03;
  }
  // faíscas
  for (let i = faiscas.length - 1; i >= 0; i--) {
    const s = faiscas[i];
    s.vida -= dt; s.v.y -= 12 * dt; s.m.position.addScaledVector(s.v, dt);
    s.m.material.opacity = Math.max(0, s.vida * 2);
    if (s.vida <= 0) { scene.remove(s.m); faiscas.splice(i, 1); }
  }
  // fogo
  const tf = performance.now() * 0.01;
  chamas.forEach((c, i) => { c.scale.y = 1 + Math.sin(tf + i) * 0.25; c.scale.x = c.scale.z = 1 + Math.cos(tf * 1.3 + i) * 0.1; });

  atualizarCamera(dt);
  renderer.render(scene, camera);
}

function ajustarTamanho() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 1.6 ? 62 : 55;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', ajustarTamanho);
window.addEventListener('orientationchange', () => setTimeout(ajustarTamanho, 200));
document.addEventListener('visibilitychange', () => { if (document.hidden) pausar(); });

/* ============ INÍCIO ============ */
function progresso(p, txt) { $('load-fill').style.width = p + '%'; $('load-txt').textContent = `${txt} ${p}%`; }

(async function iniciar() {
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  ajustarTamanho();
  progresso(20, 'Montando a arena…'); await espera(50);
  construirArena();
  progresso(60, 'Chamando os lutadores…'); await espera(50);
  jogador = criarLutador({ nome: 'Kael', pele: 0xf1c7a0, camisa: 0x1b2438, calca: 0x151a28, lenco: 0x2f7bff, cabelo: 0x15131a });
  inimigo = criarLutador({ nome: 'Ryuk', pele: 0xf1c7a0, camisa: 0x2a2630, calca: 0x1a1820, lenco: 0xd8322e, cabelo: 0xe9eef7 });
  progresso(100, 'Pronto!'); await espera(450);
  irMenu();
  camera.position.set(0, 1.9, 6.2);
  loop();
})();
