// Campo de batalha — modo Campo de Treino.
// Etapa 2: mira, carga de potência, disparo com física, vento por rodada, prévia da trajetória,
// explosões com cratera, dano e queda de personagens.
// Etapa 3 acrescenta movimento, cronômetro de 25s e ordem de turnos entre vários personagens.

import { Scene } from '../core/Game.js';
import { Camera } from '../core/Camera.js';
import { FloatingText } from '../core/FloatingText.js';
import { createRng, randomSeed } from '../core/math.js';
import { MapInstance } from '../maps/MapInstance.js';
import { getMap } from '../maps/maps.js';
import { Character } from '../characters/Character.js';
import { randomAppearance } from '../characters/appearance.js';
import { ShotController } from '../combat/ShotController.js';
import { rollWind } from '../combat/wind.js';
import { applyExplosion, spawnExplosionFx, spawnSplashFx } from '../combat/explosion.js';
import { launchState, makeEnv, stepProjectile, simulateTrajectory } from '../physics/projectile.js';
import { updateCharacterPhysics, findGroundNear } from '../physics/characterPhysics.js';
import { WEAPON_SLOTS } from '../weapons/weapons.js';
import { WORLD } from '../core/config.js';

const SHORT_PREVIEW_TIME = 0.45; // segundos de prévia no modo curto
const RESOLVE_TIME = 1.1; // pausa após a explosão antes da próxima rodada
const RESPAWN_TIME = 1.6;

export class BattleScene extends Scene {
  enter({ mapId = 'tropical', seed = randomSeed() } = {}) {
    this.mapId = mapId;
    this.previewFull = true;
    this._build(seed);
    this.game.ui.show('battleHud', { scene: this });
  }

  _build(seed) {
    const { save } = this.game;
    this.seed = seed;
    this.rng = createRng(seed ^ 0x5bd1e995);
    this.map = new MapInstance(getMap(this.mapId), seed, { particles: save.data.settings.particles });
    this.camera = new Camera(this.map.world);
    this.camera.setScreen(this.game.renderer.width, this.game.renderer.height);
    this.fx = new FloatingText();

    const spawns = this.map.spawnPoints(2);
    this.player = new Character({
      name: save.data.profile.name,
      appearance: save.data.profile.appearance,
      x: spawns[0].x,
      y: spawns[0].y,
      facing: 1,
      team: 0,
      isPlayer: true,
    });
    this.dummy = new Character({
      name: 'Boneco de Treino',
      appearance: randomAppearance(createRng(seed + 1)),
      x: spawns[1].x,
      y: spawns[1].y,
      facing: -1,
      team: 1,
    });
    this.characters = [this.player, this.dummy];
    this.homes = new Map(this.characters.map((c) => [c, c.x]));
    this.respawns = [];

    this.shot = new ShotController(this.player, WEAPON_SLOTS[0]);
    this.projectile = null;
    this.preview = null;
    this.phase = 'aim'; // aim | flight | resolve
    this.phaseTime = 0;
    this.round = 0;
    this.stats = { shots: 0, hits: 0, totalDamage: 0, best: 0 };
    this.banner = null;
    this._newRound();

    // Começa mostrando o mapa todo e depois aproxima no jogador.
    this.camera.setZoom(this.camera.fitZoom, true);
    this.camera.lookAt(this.map.world.width / 2, this.map.world.height / 2, true);
    this.introTimer = 1.2;
    this.followTarget = this.player;
  }

  regenerate() {
    this._build(randomSeed());
    this.game.events.emit('battle:regenerated', { seed: this.seed });
  }

  _newRound() {
    this.round++;
    this.wind = rollWind(this.rng, this.map.def.windRange);
    this.map.wind = this.wind;
    this.phase = 'aim';
    this.phaseTime = 0;
    this.preview = null;
  }

  showBanner(text, kind = 'info', time = 1.6) {
    this.banner = { text, kind, time, id: (this.banner?.id ?? 0) + 1 };
  }

  focus(target) {
    this.followTarget = target;
    this.camera.setZoom(this.camera.baseZoom);
  }

  /** Afasta a câmera para mostrar o mapa inteiro. */
  overview() {
    this.followTarget = null;
    this.camera.setZoom(this.camera.fitZoom);
    this.camera.lookAt(this.map.world.width / 2, this.map.world.height / 2);
  }

  togglePreview() {
    this.previewFull = !this.previewFull;
    this.showBanner(this.previewFull ? 'Prévia: trajetória completa' : 'Prévia: só o começo', 'info', 1.2);
  }

  resize(w, h) {
    this.camera.setScreen(w, h);
    this.camera.setZoom(this.camera.targetZoom);
  }

  // ------------------------------------------------------------------ update

  update(dt) {
    const { input } = this.game;

    if (input.wasPressed('Escape')) {
      this.game.changeScene('menu');
      return;
    }
    if (input.wasPressed('KeyR')) {
      this.regenerate();
      return;
    }
    if (input.wasPressed('KeyT')) this.togglePreview();
    if (input.wasPressed('KeyF')) this.overview();

    this._updateCameraInput(input);
    this.phaseTime += dt;

    if (this.phase === 'aim') this._updateAim(dt, input);
    else if (this.phase === 'flight') this._updateFlight(dt);
    else if (this.phase === 'resolve') this._updateResolve();

    this._updateCharacters(dt);
    if (this.banner && (this.banner.time -= dt) <= 0) this.banner = null;

    this.fx.update(dt);
    this.map.update(dt, this.camera);
    this._updateCameraFollow(dt);
    this.camera.update(dt);
  }

  _updateCameraInput(input) {
    if (input.pointer.dragX || input.pointer.dragY) {
      this.followTarget = null;
      this.camera.pan(input.pointer.dragX, input.pointer.dragY);
    }
    if (input.wheel) this.camera.setZoom(this.camera.targetZoom * Math.exp(-input.wheel * 0.0015));
  }

  _updateCameraFollow(dt) {
    if (this.introTimer > 0) {
      this.introTimer -= dt;
      if (this.introTimer <= 0 && this.followTarget) this.camera.setZoom(this.camera.baseZoom);
      return;
    }
    if (this.phase === 'flight' && this.projectile) {
      this.camera.lookAt(this.projectile.x, this.projectile.y);
    } else if (this.followTarget) {
      const t = this.followTarget;
      // Olha um pouco à frente da mira.
      const ahead = t === this.player ? t.facing * 160 : 0;
      this.camera.lookAt(t.x + ahead, t.y - 80);
    }
  }

  _updateAim(dt, input) {
    const p = this.player;
    if (p.defeated) return;
    const shot = this.shot;
    const fine = input.isDown('ShiftLeft', 'ShiftRight');

    if (input.isDown('ArrowUp', 'KeyW')) shot.adjustAngle(1, dt, fine);
    if (input.isDown('ArrowDown', 'KeyS')) shot.adjustAngle(-1, dt, fine);
    // Virar de lado (andar entra na Etapa 3).
    if (input.wasPressed('ArrowLeft', 'KeyA')) shot.face(-1);
    if (input.wasPressed('ArrowRight', 'KeyD')) shot.face(1);
    if (input.wasPressed('Digit1')) shot.weaponId = WEAPON_SLOTS[0];

    if (input.wasPressed('Space') && !shot.charging) shot.startCharge();
    if (shot.charging) {
      shot.updateCharge(dt);
      if (input.wasReleased('Space') || !input.isDown('Space')) this._fire();
    }
    if (this.phase === 'aim') this._updatePreview();
  }

  _env(ownerId) {
    return makeEnv({
      terrain: this.map.terrain,
      weapon: this.shot.weapon,
      wind: this.wind,
      targets: this.characters,
      ownerId,
      world: this.map.world,
    });
  }

  _updatePreview() {
    const shot = this.shot;
    const power = shot.charging ? shot.power : shot.lastPower ?? 60;
    const start = launchState(shot.muzzle(), shot.angle, this.player.facing, Math.max(1, power), shot.weapon);
    this.preview = simulateTrajectory(start, this._env(this.player.id), {
      maxTime: this.previewFull ? undefined : SHORT_PREVIEW_TIME,
    });
  }

  _fire() {
    const shot = this.shot;
    const power = shot.release();
    if (power == null) return;
    const weapon = shot.weapon;
    const muzzle = shot.muzzle();
    this.projectile = {
      ...launchState(muzzle, shot.angle, this.player.facing, power, weapon),
      weapon,
      ownerId: this.player.id,
      trail: [],
    };
    this.projectileEnv = this._env(this.player.id);
    this.phase = 'flight';
    this.phaseTime = 0;
    this.preview = null;
    this.stats.shots++;
    this.followTarget = this.player;

    this.game.audio.play('shoot');
    this._shake(3, 0.15);
    for (let i = 0; i < 8; i++) {
      this.map.particles.spawn({
        x: muzzle.x,
        y: muzzle.y,
        vx: (this.projectile.vx / 8) * Math.random(),
        vy: (this.projectile.vy / 8) * Math.random() - 20,
        life: 0.5,
        size: 5,
        color: 'rgba(230,230,230,0.7)',
        drag: 3,
        grow: 10,
      });
    }
  }

  _updateFlight(dt) {
    const p = this.projectile;
    const impact = stepProjectile(p, this.projectileEnv, dt);
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 40) p.trail.shift();
    if (!impact) return;

    if (impact.type === 'out') {
      this.showBanner('Saiu do mapa!', 'warn');
    } else {
      this._explode(impact);
    }
    this.projectile = null;
    this.phase = 'resolve';
    this.phaseTime = 0;
  }

  _explode(impact) {
    const weapon = this.shot.weapon;
    const directTarget = impact.type === 'target' ? impact.target : null;
    const hits = applyExplosion({
      map: this.map,
      characters: this.characters,
      x: impact.x,
      y: impact.y,
      weapon,
      directTarget,
    });
    spawnExplosionFx(this.map.particles, impact.x, impact.y, weapon, this.map.def.palette);
    this.game.audio.play('explosion');
    this._shake(12, 0.45);

    let dealtToEnemy = 0;
    for (const h of hits) {
      const dealt = h.target.takeDamage(h.damage);
      if (!dealt) continue;
      this.fx.add(h.target.x, h.target.y - 86, `-${dealt}`, {
        color: h.direct ? '#ffd23f' : h.target === this.player ? '#ff8f8f' : '#ffffff',
        size: h.direct ? 30 : 24,
      });
      if (h.target !== this.player) dealtToEnemy += dealt;
    }
    if (hits.length) this.game.audio.play('hit');
    if (dealtToEnemy > 0) {
      this.stats.hits++;
      this.stats.totalDamage += dealtToEnemy;
      this.stats.best = Math.max(this.stats.best, dealtToEnemy);
    }
    if (directTarget && directTarget !== this.player) this.showBanner('Acerto direto!', 'good');
    else if (this.dummy.defeated && dealtToEnemy > 0) this.showBanner('Alvo derrotado!', 'good');
  }

  _updateResolve() {
    const settling = this.characters.some((c) => c.alive && c.vy > 0);
    if (this.phaseTime >= RESOLVE_TIME && !settling) {
      this._newRound();
      this.followTarget = this.player;
    }
  }

  _updateCharacters(dt) {
    for (const c of this.characters) {
      c.update(dt);
      const status = updateCharacterPhysics(c, this.map.terrain, dt);
      if (status === 'eliminated') {
        spawnSplashFx(this.map.particles, c.x, WORLD.fluidLevel, this.map.def.fluid);
        this.game.audio.play('splash');
        this.showBanner(c === this.player ? 'Você caiu do mapa!' : `${c.name} caiu do mapa!`, c === this.player ? 'bad' : 'good');
      }
      // No treino, quem é derrotado volta depois de um instante.
      if (c.defeated && !this.respawns.some((r) => r.char === c)) {
        this.respawns.push({ char: c, timer: RESPAWN_TIME });
      }
    }
    for (const r of this.respawns) {
      r.timer -= dt;
      if (r.timer <= 0) {
        const spot = findGroundNear(this.map.terrain, this.homes.get(r.char)) ?? this.map.spawnPoints(1)[0];
        r.char.revive(spot.x, spot.y);
      }
    }
    this.respawns = this.respawns.filter((r) => r.timer > 0);
  }

  _shake(amount, duration) {
    if (this.game.save.data.settings.screenShake) this.camera.shake(amount, duration);
  }

  // ------------------------------------------------------------------ render

  render(ctx) {
    const { width, height } = this.game.renderer;
    this.map.renderBackground(ctx, this.camera, width, height);
    ctx.save();
    this.camera.apply(ctx);
    this.map.renderWorld(ctx, this.camera);
    this._drawPreview(ctx);
    for (const c of this.characters) c.draw(ctx, { showHp: true });
    this._drawProjectile(ctx);
    this.map.renderForeground(ctx, this.camera);
    this.fx.draw(ctx);
    ctx.restore();
  }

  _drawPreview(ctx) {
    const pv = this.preview;
    if (!pv || this.phase !== 'aim' || this.player.defeated) return;
    const pts = pv.points;
    // Um ponto a cada 4 passos, ficando mais transparente no fim.
    for (let i = 4; i < pts.length; i += 4) {
      const k = 1 - i / pts.length;
      ctx.globalAlpha = 0.35 + 0.6 * k;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(43,29,46,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Marca o ponto de impacto previsto.
    if (pv.impact && pv.impact.type !== 'out') {
      const { x, y } = pv.impact;
      ctx.strokeStyle = pv.impact.type === 'target' ? '#ffd23f' : 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x, y + 14);
      ctx.stroke();
    }
  }

  _drawProjectile(ctx) {
    const p = this.projectile;
    if (!p) return;
    const style = p.weapon.projectile;
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      ctx.globalAlpha = (i / p.trail.length) * 0.7;
      ctx.fillStyle = style.trail;
      ctx.beginPath();
      ctx.arc(t.x, t.y, style.radius * (0.3 + (i / p.trail.length) * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = style.color;
    ctx.strokeStyle = '#2b1d2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, style.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(p.x - 2, p.y - 2, style.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}
