const PARAMETERS = {
  separation: 1.65,
  alignment: 1.05,
  cohesion: 1.15,
  force: 0.18,
  speed: 3.1
};

let agents = [];
let clusters = [];
let fragments = [];
let grid;
let dynamic = { ...PARAMETERS };
let nextRupture = 620;
let rupturePower = 0;
let localRuptures = [];
let resetSeed = 0;
let rhythmMode = 1;
let rhythmBeat = 0;
let beatAccent = 0;
let lastBeat = -1;
let modeClock = 0;
let flowAngle = 0;
let scanPulse = 0;
let shockwaves = [];
let carouselEnabled = false;
let carouselAngle = 0;
let carouselSpeed = 0.0022;
let fairgroundPulse = 0;
let orbitFlip = 1;
let orbitGate = 1;
let vortexPower = 0;
let vortexAngle = 0;
let sceneSweep = 0;
let strobeGate = 0;
let clusterCollapse = 0;
let trailEcho = 12;
let mechanicalJitter = 0;
let symmetryMode = 1;
let scatterMode = 0;
let sceneMode = 0;
let sceneEnergy = 0;
let scenePhase = 0;
let sceneDirection = 1;
let cutFlash = 0;
let glitchLine = [];
let dragPoints = [];
let dragPulse = 0;
let scenePulse = 0;
let coverReveal = 0;
let track = null;

const BPM = 132;
const BEAT_MS = 60000 / BPM;
const NEIGHBOR_RADIUS = 72;
const SEPARATION_RADIUS = 25;

class Agent {
  constructor(x, y, clusterIndex, index) {
    const angle = random(TWO_PI);
    const speed = random(0.25, 1.2);
    this.position = createVector(x, y);
    this.velocity = p5.Vector.fromAngle(angle).mult(speed);
    this.acceleration = createVector();
    this.phaseOffset = random(TWO_PI);
    this.maxForce = dynamic.force;
    this.maxSpeed = dynamic.speed;
    this.clusterIndex = clusterIndex;
    this.index = index;
    this.trail = [];
    this.wanderAngle = random(TWO_PI);
    this.phase = random(TWO_PI);
    this.size = random(0.24, 0.58);
    this.depth = random(0.55, 1);
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  steer(target) {
    const desired = p5.Vector.sub(target, this.position);
    const distance = desired.mag();
    if (distance === 0) return createVector();

    desired.normalize();
    const scale = distance < 95 ? map(distance, 0, 95, 0.15, 1, true) : 1;
    desired.mult(this.maxSpeed * scale);
    desired.sub(this.velocity);
    desired.limit(this.maxForce);
    return desired;
  }

  seek(target) {
    this.applyForce(this.steer(target));
  }

  flee(target) {
    const away = this.steer(target).mult(-1);
    this.applyForce(away);
  }

  wander(time) {
    this.wanderAngle += (noise(this.index * 0.08, time * 0.0005) - 0.5) * 0.5;
    let forward = this.velocity.copy();
    if (forward.magSq() > 0.001) forward.normalize();
    else forward = createVector(1, 0);

    const wanderForce = p5.Vector.fromAngle(this.wanderAngle);
    wanderForce.mult(0.7).add(forward);
    wanderForce.setMag(this.maxForce * 0.68);
    this.applyForce(wanderForce);
  }

  separate(neighbors) {
    const sum = createVector();
    let count = 0;

    for (const other of neighbors) {
      const distance = p5.Vector.dist(this.position, other.position);
      if (distance > 0 && distance < SEPARATION_RADIUS) {
        const away = p5.Vector.sub(this.position, other.position);
        away.normalize().div(max(distance, 0.5));
        sum.add(away);
        count++;
      }
    }

    if (count) {
      sum.div(count);
      sum.setMag(this.maxSpeed);
      sum.sub(this.velocity);
      sum.limit(this.maxForce);
    }
    return sum;
  }

  align(neighbors) {
    const sum = createVector();
    let count = 0;
    for (const other of neighbors) {
      sum.add(other.velocity);
      count++;
    }
    if (!count) return sum;

    sum.div(count);
    sum.setMag(this.maxSpeed);
    sum.sub(this.velocity);
    sum.limit(this.maxForce);
    return sum;
  }

  cohesion(neighbors) {
    const center = createVector();
    let count = 0;
    for (const other of neighbors) {
      center.add(other.position);
      count++;
    }
    if (!count) return center;
    center.div(count);
    return this.steer(center);
  }

  update() {
    this.maxForce = lerp(this.maxForce, dynamic.force, 0.035);
    this.maxSpeed = lerp(this.maxSpeed, dynamic.speed, 0.035);
    this.velocity.add(this.acceleration);
    this.velocity.limit(this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);

    const margin = 18;
    if (this.position.x < margin) this.position.x = margin;
    if (this.position.x > width - margin) this.position.x = width - margin;
    if (this.position.y < margin) this.position.y = margin;
    if (this.position.y > height - margin) this.position.y = height - margin;

    if (frameCount % 3 === 0) {
      if (trailEcho > 6) this.trail.push(this.position.copy());
      if (this.trail.length > trailEcho) this.trail.shift();
    }
    this.phase += 0.018 + this.depth * 0.012;
  }

  drawTrail() {
    if (this.trail.length < 3) return;
    noFill();
    beginShape();
    const red = rupturePower > 0.15;
    if (red) stroke(255, 32, 55, 32 * rupturePower);
    else stroke(190, 197, 207, 9);
    strokeWeight(0.55);
    for (const point of this.trail) curveVertex(point.x, point.y);
    endShape();
  }

  draw() {
    noStroke();
    const pulse = (sin(this.phase) + 1) * 0.5;
    const radius = this.size * (0.25 + pulse * 0.08);
    const redChance = rupturePower > 0.18 && noise(this.index * 0.5, frameCount * 0.05) > 0.73;

    if (redChance) {
      fill(255, 28, 48, 220);
    } else {
      const coverBrightness = 132 + coverReveal * (82 + pulse * 18);
      fill(coverBrightness, coverBrightness + 4, coverBrightness + 10,
        24 + pulse * 18 + coverReveal * 82);
    }

    const coverScale = 1 + coverReveal * 1.5;
    circle(this.position.x, this.position.y, radius * 2 * coverScale);
    if (pulse > 0.985 && redChance) {
      fill(255, 28, 48, 34);
      circle(this.position.x, this.position.y, radius * 2.2);
    }
  }
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("canvas-container");
  pixelDensity(1);
  colorMode(RGB);
  strokeCap(ROUND);
  track = new Audio("maretu.mp3");
  track.preload = "auto";
  track.volume = 0.9;
  bindVolumeControl();
  resetOrganism();
}

function bindVolumeControl() {
  const volumeInput = document.getElementById("volume");
  volumeInput.addEventListener("input", () => {
    if (track) track.volume = Number(volumeInput.value) / 100;
  });
}

function setVolume(delta) {
  const volumeInput = document.getElementById("volume");
  const next = constrain(Number(volumeInput.value) + delta, 0, 100);
  volumeInput.value = next;
  if (track) track.volume = next / 100;
}

function playTrack() {
  if (!track) return;
  track.play().catch(() => {});
}

function restartTrack() {
  if (!track) return;
  track.pause();
  track.currentTime = 0;
  playTrack();
}

function draw() {
  noStroke();
  fill(3, 3, 4, 29);
  rect(0, 0, width, height);

  updateRhythm();
  updateDynamicParameters();
  updateClusters();
  triggerRuptures();
  buildSpatialGrid();
  updateAgents();
  drawFilaments();
  drawTrails();
  drawFragments();
  drawAgents();
  drawRuptureField();
  drawShockwaves();
  drawDragTrace();
  drawSceneSweep();
  drawRhythmLight();
  drawCarousel();
  drawEntityMasses();
  drawScene();
  drawCore();

  vortexPower *= 0.955;
  sceneSweep *= 0.94;
  strobeGate *= 0.88;
  clusterCollapse *= 0.94;
  mechanicalJitter *= 0.9;
  scatterMode *= 0.96;
  sceneEnergy *= 0.986;
  dragPulse *= 0.94;
  cutFlash *= 0.82;
  coverReveal = lerp(coverReveal, sceneMode === 0 ? 0 : 1, 0.045);
  scenePhase += sceneMode === 0 ? 0.002 : 0.016 * sceneDirection;
  beatAccent *= 0.91;
  rupturePower *= 0.968;
}

function resetOrganism() {
  sceneMode = 0;
  sceneEnergy = 0;
  coverReveal = 0;
  cutFlash = 0;
  glitchLine = [];
  carouselEnabled = false;
  resetSeed = floor(random(100000));
  randomSeed(resetSeed);
  noiseSeed(resetSeed);
  agents = [];
  clusters = [];
  fragments = [];
  localRuptures = [];
  shockwaves = [];
  orbitFlip = 1;
  orbitGate = 1;
  vortexPower = 0;
  sceneSweep = 0;
  strobeGate = 0;
  clusterCollapse = 0;
  symmetryMode = 1;
  scatterMode = 0;
  rupturePower = 0;
  nextRupture = 450 + random(420);

  const count = floor(constrain(width * height / 3900, 105, 210));
  const countX = width < 700 ? 4 : 7;
  const countY = width < 700 ? 5 : 5;

  for (let y = 0; y < countY; y++) {
    for (let x = 0; x < countX; x++) {
      const latticeAngle = TWO_PI * (x * 0.7 + y * 1.13) / 3;
      const cx = width * (0.15 + x / max(1, countX - 1) * 0.68)
        + cos(latticeAngle) * width * 0.035;
      const cy = height * (0.19 + y / max(1, countY - 1) * 0.58)
        + sin(latticeAngle) * height * 0.035;
      clusters.push({
        baseX: cx,
        baseY: cy,
        x: cx,
        y: cy,
        phase: random(TWO_PI),
        radius: random(22, 72),
        pull: random(0.0008, 0.0022)
      });
    }
  }

  for (let i = 0; i < count; i++) {
    const cluster = floor(random(clusters.length));
    const c = clusters[cluster];
    const angle = random(TWO_PI);
    const spread = c.radius * sqrt(random());
    agents.push(new Agent(
      c.x + cos(angle) * spread,
      c.y + sin(angle) * spread * 0.72,
      cluster,
      i
    ));
  }

  background(3, 3, 4);
}

function updateRhythm() {
  const beat = floor(millis() / BEAT_MS);
  if (beat !== lastBeat) {
    lastBeat = beat;
    rhythmBeat = beat % 16;
    const accent = rhythmBeat === 0 || rhythmBeat === 8;
    const stab = rhythmBeat === 3 || rhythmBeat === 7 || rhythmBeat === 11;
    beatAccent = accent ? 1 : stab ? 0.62 : 0.22;

    if (rhythmMode === 3 && (rhythmBeat === 4 || rhythmBeat === 12)) {
      rupture(width * random(0.22, 0.78), height * random(0.2, 0.8), 1.25);
    } else if (accent && rhythmMode === 2) {
      shockwaves.push({ x: width * 0.5, y: height * 0.5, radius: 10, life: 1 });
    }
  }
  modeClock += 0.004;
  carouselAngle += carouselSpeed * (carouselEnabled ? 1 : 0.18);
  fairgroundPulse = lerp(fairgroundPulse, beatAccent, 0.06);
  vortexAngle += 0.018 * orbitFlip * (carouselEnabled ? 1.8 : 0.7);
  sceneSweep = max(sceneSweep, 0);
}

function updateDynamicParameters() {
  const t = millis() * 0.00008;
  const broad = sin(t * TWO_PI);
  const secondary = noise(t * 2.3, 18);

  const modePower = rhythmMode === 2 ? 1.18 : rhythmMode === 3 ? 1.38 : 0.92;
  const beatPulse = beatAccent * (rhythmMode === 3 ? 0.3 : 0.14);

  dynamic.separation = PARAMETERS.separation * modePower
    * (0.72 + broad * 0.22 + secondary * 0.25 + beatPulse);
  dynamic.alignment = PARAMETERS.alignment
    * (0.78 + sin(t * TWO_PI * 0.63 + 1.7) * 0.22 + (rhythmMode === 1 ? beatAccent * 0.12 : 0));
  dynamic.cohesion = PARAMETERS.cohesion
    * (0.58 + secondary * 0.58 - beatPulse * (rhythmMode === 3 ? 0.8 : 0.2));
  dynamic.force = PARAMETERS.force * modePower
    * (0.78 + broad * 0.16 + noise(t * 1.7, 4) * 0.24 + beatPulse);
  dynamic.speed = PARAMETERS.speed * modePower
    * (0.74 + secondary * 0.42 + beatPulse);

}

function updateClusters() {
  for (const c of clusters) {
    c.phase += 0.0028;
      let drift = sin(c.phase * 0.71) * min(width, height)
        * (rhythmMode === 3 ? 0.045 : rhythmMode === 2 ? 0.032 : 0.023);
      c.x = c.baseX + cos(c.phase) * drift;
      c.y = c.baseY + sin(c.phase * 1.17) * drift;

      if (carouselEnabled) {
        const index = clusters.indexOf(c);
        const orbit = TWO_PI * index / clusters.length * symmetryMode
          + carouselAngle * orbitFlip;
        const orbitRadius = min(width, height)
          * orbitGate * (0.26 + sin(index * 2.1) * 0.04);
        c.x = width * 0.5 + cos(orbit) * orbitRadius;
        c.y = height * 0.5 + sin(orbit) * orbitRadius * 0.66;

        c.x += cos(vortexAngle + index) * vortexPower * 45;
        c.y += sin(vortexAngle * 1.3 + index) * vortexPower * 32;
        c.x += (random() - 0.5) * mechanicalJitter * 16;
        c.y += (random() - 0.5) * mechanicalJitter * 16;
      }

      if (sceneMode === 1) {
        const band = floor(clusters.indexOf(c) / 7);
        c.x = width * (0.2 + band * 0.12) + sin(scenePhase * 1.7 + band) * width * 0.11;
        c.y = height * (0.12 + (clusters.indexOf(c) % 7) * 0.125);
      } else if (sceneMode === 2) {
        const index = clusters.indexOf(c);
        const column = index % 7;
        const row = floor(index / 7);
        c.x = width * (0.16 + column * 0.11)
          + sin(scenePhase * 2 + row) * width * 0.025;
        c.y = height * (0.16 + row * 0.22)
          + cos(scenePhase * 3 + column) * height * 0.1;
      } else if (sceneMode === 3) {
        const index = clusters.indexOf(c);
        const angle = index * TWO_PI / clusters.length + scenePhase;
        const depth = 0.12 + 0.72 * ((sin(scenePhase * 0.7 + index) + 1) * 0.5);
        c.x = width * 0.5 + cos(angle) * width * 0.34 * depth;
        c.y = height * 0.5 + sin(angle) * height * 0.22 * depth;
      } else if (sceneMode === 4) {
        const index = clusters.indexOf(c);
        c.x = width * (0.14 + (index % 7) * 0.12)
          + sin(scenePhase * 2.4 + index) * width * 0.055;
        c.y = height * (0.2 + floor(index / 7) * 0.21)
          + sin(scenePhase * 5.1 + index * 0.8) * height * 0.12;
      }

      const close = dist(mouseX, mouseY, c.x, c.y);
    if (mouseIsPressed && close < 260 && close > 0) {
      const influence = (260 - close) / 260;
      c.x += (c.x - mouseX) * influence * 0.012;
      c.y += (c.y - mouseY) * influence * 0.012;
    }
  }
}

function buildSpatialGrid() {
  grid = new Map();
  for (const agent of agents) {
    const cx = floor(agent.position.x / NEIGHBOR_RADIUS);
    const cy = floor(agent.position.y / NEIGHBOR_RADIUS);
    const key = `${cx},${cy}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(agent);
  }
}

function neighborsOf(agent) {
  const result = [];
  const cx = floor(agent.position.x / NEIGHBOR_RADIUS);
  const cy = floor(agent.position.y / NEIGHBOR_RADIUS);

  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cell = grid.get(`${cx + ox},${cy + oy}`);
      if (!cell) continue;
      for (const other of cell) {
        if (other === agent) continue;
        const dx = agent.position.x - other.position.x;
        const dy = agent.position.y - other.position.y;
        if (dx * dx + dy * dy < NEIGHBOR_RADIUS * NEIGHBOR_RADIUS) {
          result.push(other);
        }
      }
    }
  }
  return result;
}

function updateAgents() {
  for (const agent of agents) {
    const neighbors = neighborsOf(agent);
    const c = clusters[agent.clusterIndex];
    const clusterTarget = createVector(c.x, c.y);

    const separation = agent.separate(neighbors).mult(dynamic.separation);
    const alignment = agent.align(neighbors).mult(dynamic.alignment);
    const cohesion = agent.cohesion(neighbors).mult(dynamic.cohesion);
    const clusterSeek = agent.steer(clusterTarget).mult(c.pull * 420);

    agent.applyForce(separation);
    agent.applyForce(alignment);
    agent.applyForce(cohesion);
    agent.applyForce(clusterSeek);

    if (sceneMode !== 0) {
      const coverTarget = getCoverTarget(agent);
      agent.applyForce(agent.steer(coverTarget).mult(2.8 * coverReveal));
      agent.wander(millis());
    } else {
      agent.wander(millis());
    }

    if (rhythmMode !== 1) {
      const tangent = createVector(
        agent.position.y - height * 0.5,
        -(agent.position.x - width * 0.5)
      );
      tangent.normalize();
      tangent.rotate(flowAngle + sin(modeClock + agent.phaseOffset) * 0.22);
      tangent.setMag(dynamic.force * (rhythmMode === 3 ? 1.65 : 0.9));
        agent.applyForce(tangent);
    }

      if (vortexPower > 0.02) {
        const cx = agent.position.x - width * 0.5;
        const cy = agent.position.y - height * 0.5;
        const swirl = createVector(-cy, cx).normalize();
        swirl.setMag(dynamic.force * vortexPower * 2.4);
        agent.applyForce(swirl);
      }

      if (clusterCollapse > 0.02) {
        const c = clusters[agent.clusterIndex];
        agent.seek(createVector(width * 0.5 + (c.x - width * 0.5) * clusterCollapse,
          height * 0.5 + (c.y - height * 0.5) * clusterCollapse));
      }

      if (scatterMode > 0.02) {
        const fromCenter = p5.Vector.sub(agent.position,
          createVector(width * 0.5, height * 0.5)).normalize();
        fromCenter.setMag(dynamic.force * scatterMode * 2.1);
        agent.applyForce(fromCenter);
      }

      if (sceneMode === 1) {
        const targetY = agent.position.y + sceneDirection * (height * 0.0015);
        agent.applyForce(createVector(sceneDirection * dynamic.force * 2.1,
          sin(scenePhase * 4 + agent.index) * dynamic.force));
        agent.position.y += (targetY - agent.position.y) * 0.015;
      } else if (sceneMode === 2) {
        const phase = floor(agent.position.x / max(1, width / 7));
        const snap = createVector(agent.position.x,
          height * (0.5 + sin(scenePhase * 3 + phase) * 0.26));
        agent.seek(snap);
      } else if (sceneMode === 3) {
        const outward = p5.Vector.sub(agent.position,
          createVector(width * 0.5, height * 0.5)).normalize();
        outward.rotate(sceneDirection * PI * 0.52);
        outward.setMag(dynamic.force * 1.8);
        agent.applyForce(outward);
      } else if (sceneMode === 4) {
        const pulse = sin(scenePhase * 5.5 + agent.index * 0.17);
        const impact = createVector(sceneDirection * pulse * dynamic.force * 2.5,
          cos(scenePhase * 3.7 + agent.index) * dynamic.force * 1.6);
        agent.applyForce(impact);
      }

      applyUserField(agent);
    applyRuptureField(agent);

    const edgeDistance = min(agent.position.x, agent.position.y,
      width - agent.position.x, height - agent.position.y);
    if (edgeDistance < 90) {
      agent.seek(createVector(width * 0.5, height * 0.5));
    }

    agent.update();
  }
}

function applyUserField(agent) {
  const mouse = createVector(mouseX, mouseY);
  const distance = p5.Vector.dist(agent.position, mouse);
  if (distance > 190 || distance === 0) return;

  if (mouseIsPressed) {
    const dragDirection = createVector(mouseX - pmouseX, mouseY - pmouseY);
    if (dragDirection.magSq() > 0) {
      dragDirection.normalize().mult(dynamic.force * (1.2 + dragPulse));
      agent.applyForce(dragDirection);
    }
    agent.flee(mouse);
  } else {
    agent.flee(mouse);
  }
}

function applyRuptureField(agent) {
  if (rupturePower < 0.03) return;
  const center = createVector(width * 0.5, height * 0.5);
  const outward = p5.Vector.sub(agent.position, center);
  if (outward.magSq() > 0) {
    outward.normalize().mult(dynamic.force * rupturePower * 1.7);
    agent.applyForce(outward);
  }

  for (const point of localRuptures) {
    const dx = agent.position.x - point.x;
    const dy = agent.position.y - point.y;
    const distance = sqrt(dx * dx + dy * dy);
    if (distance > 0 && distance < point.radius) {
      const force = createVector(
        agent.position.x - point.x,
        agent.position.y - point.y
      ).normalize();
      force.mult(dynamic.force * point.life * (1 - distance / point.radius) * 2.2);
      agent.applyForce(force);
    }
  }
}

function drawFilaments() {
  const maxDistance = 62 + dynamic.cohesion * 12;
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    const neighbors = neighborsOf(a);
    for (const b of neighbors) {
      if (b.index <= a.index) continue;
      const d = p5.Vector.dist(a.position, b.position);
      if (d >= maxDistance) continue;

      const alpha = map(d, 0, maxDistance, 18, 0, true);
      const active = rupturePower > 0.25 && noise(a.index * 0.21, b.index * 0.17, frameCount * 0.03) > 0.82;
      if (active) stroke(255, 27, 49, alpha * 1.8);
      else stroke(167, 177, 190, alpha);
      strokeWeight(map(d, 0, maxDistance, 0.42, 0.12, true));
      line(a.position.x, a.position.y, b.position.x, b.position.y);
    }
  }
}

function drawTrails() {
  for (const agent of agents) agent.drawTrail();
}

function drawAgents() {
  for (const agent of agents) agent.draw();
}

function drawCore() {
  const pulse = sin(millis() * 0.002) * 7;
  const count = 5;
  push();
  translate(width * 0.5, height * 0.5);
  noFill();
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399 + millis() * 0.00008;
    const radius = 24 + i * 14 + pulse;
    stroke(rupturePower > 0.2 ? 255 : 188,
      rupturePower > 0.2 ? 30 : 196,
      rupturePower > 0.2 ? 50 : 208,
      42 - i * 5);
    strokeWeight(0.55);
    ellipse(cos(angle) * i * 5, sin(angle) * i * 3, radius * 2,
      radius * (1.15 + i * 0.035));
  }
  pop();
}

function drawFragments() {
  noStroke();
  for (let i = fragments.length - 1; i >= 0; i--) {
    const fragment = fragments[i];
    fragment.position.add(fragment.velocity);
    fragment.velocity.mult(0.985);
    fragment.life -= 1;
    fill(255, 28, 48, map(fragment.life, 0, fragment.maxLife, 0, 180));
    circle(fragment.position.x, fragment.position.y, fragment.size);
    if (fragment.life <= 0) fragments.splice(i, 1);
  }
}

function drawRuptureField() {
  noFill();
  for (let i = localRuptures.length - 1; i >= 0; i--) {
    const point = localRuptures[i];
    point.life *= 0.94;
    point.radius += 3.2;
    stroke(255, 28, 48, 90 * point.life);
    strokeWeight(0.7);
    circle(point.x, point.y, point.radius * 2);
    if (point.life < 0.025) localRuptures.splice(i, 1);
  }
}

function triggerRuptures() {
  if (frameCount >= nextRupture) {
    rupture(width * random(0.22, 0.78), height * random(0.18, 0.82), 2.2);
    nextRupture = frameCount + 420 + floor(random(540));
  }
}

function sequence(count, phaseOffset = 0) {
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  for (let i = 0; i < count; i++) {
    const target = i / count;
    setTimeout(() => {
      const angle = TWO_PI * target + phaseOffset;
      const radius = min(width, height) * (0.18 + (i % 5) * 0.055);
      rupture(centerX + cos(angle) * radius, centerY + sin(angle) * radius, 1.35);
    }, i * 55);
  }
}

function activateScene(mode) {
  sceneMode = mode;
  sceneEnergy = 1;
  cutFlash = 1;
  scenePhase = random(TWO_PI);
  sceneDirection = random() > 0.5 ? 1 : -1;
  carouselEnabled = mode === 0;
  glitchLine = [];
  for (let i = 0; i < 18; i++) {
    glitchLine.push({
      y: random(height),
      x: random(width),
      width: random(30, width * 0.7),
      life: random(0.5, 1)
    });
  }
  for (const agent of agents) {
    agent.velocity.add(p5.Vector.random2D().mult(random(1.2, 4.5)));
  }
}

function coverPointOnPolyline(points, amount) {
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const segment = dist(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
    lengths.push(segment);
    total += segment;
  }

  let remaining = amount * total;
  let segmentIndex = lengths.length - 1;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      segmentIndex = i;
      break;
    }
    remaining -= lengths[i];
  }

  const a = points[segmentIndex];
  const b = points[segmentIndex + 1];
  const segment = lengths[segmentIndex] || 1;
  const ratio = remaining / segment;
  return [lerp(a[0], b[0], ratio), lerp(a[1], b[1], ratio)];
}

function getCoverTarget(agent) {
  const phase = agent.index / max(1, agents.length);
  const pulse = sin(scenePhase * 2.2 + agent.phaseOffset);
  const minSide = min(width, height);
  const cx = width * 0.5;
  const cy = height * 0.5;

  if (sceneMode === 1) {
    const crown = [
      [0.31, 0.68], [0.34, 0.42], [0.39, 0.54], [0.44, 0.30],
      [0.50, 0.50], [0.56, 0.30], [0.61, 0.54], [0.66, 0.42],
      [0.69, 0.68], [0.31, 0.68]
    ];
    const p = coverPointOnPolyline(crown, phase);
    const orb = [cx + (p[0] - 0.5) * minSide * 1.25,
      cy + (p[1] - 0.5) * minSide * 1.25];
    return createVector(orb[0] + pulse * 1.2, orb[1] + sin(agent.index) * 1.4);
  }

  if (sceneMode === 2) {
    const ringIndex = agent.index % 5;
    const ringRadius = minSide * (0.09 + ringIndex * 0.055);
    const angle = phase * TWO_PI * (5 - ringIndex * 0.12)
      + sceneDirection * scenePhase * 0.25;
    const ellipse = ringIndex % 2 === 0 ? 1 : 0.86;
    return createVector(cx + cos(angle) * ringRadius,
      cy + sin(angle) * ringRadius * ellipse + pulse * 2);
  }

  if (sceneMode === 3) {
    const turns = 5.5;
    const angle = phase * TWO_PI * turns + sceneDirection * scenePhase;
    const radius = minSide * (0.08 + phase * 0.34);
    return createVector(cx + cos(angle) * radius,
      cy + sin(angle) * radius * 0.92 + sin(angle * 7) * 4);
  }

  const quadrant = agent.index % 4;
  const gx = (agent.index % 13) / 12;
  const gy = floor(agent.index / 13) / 17;
  const angle = phase * TWO_PI + scenePhase;
  const fragment = quadrant < 2 ? gx : 1 - gx;
  return createVector(cx + (fragment - 0.5) * minSide * 0.78,
    cy + (gy - 0.5) * minSide * 0.58 + sin(angle + gy * 8) * 7 * sceneEnergy);
}

function drawEntityMasses() {
  if (agents.length < 2) return;

  push();
  blendMode(SCREEN);
  noFill();

  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const ring = [];
    for (const agent of agents) {
      if (agent.clusterIndex === i) ring.push(agent.position);
    }
    if (ring.length < 8) continue;

    const step = sceneMode === 0 ? 3 : 2;

    let center = createVector(0, 0);
    for (const point of ring) center.add(point);
    center.div(ring.length);

    ring.sort((a, b) =>
      atan2(a.y - center.y, a.x - center.x)
      - atan2(b.y - center.y, b.x - center.x));

    const tight = sceneMode === 2 ? 0.72 : 1;
    const cut = sceneMode === 4 ? sin(scenePhase * 4 + i) * 34 : 0;
    beginShape();
    stroke(sceneMode === 3 ? 220 : 126,
      sceneMode === 3 ? 38 : 134,
      sceneMode === 3 ? 58 : 142,
      sceneMode === 0 ? 18 : 28);
    strokeWeight(sceneMode === 4 ? 0.8 : 0.45);
    curveVertex(ring[0].x + cut, ring[0].y);
    for (let r = 0; r < ring.length; r += step) {
      const point = ring[r];
      curveVertex(point.x + cut * tight,
        point.y + sin(point.x * 0.01 + scenePhase) * 7);
    }
    curveVertex(ring[0].x + cut, ring[0].y);
    endShape(CLOSE);

    for (let j = 0; j + 3 < ring.length; j += 5) {
      const a = ring[j];
      const b = ring[j + 3];
      stroke(229, 234, 242, sceneMode === 0 ? 12 : 8);
      strokeWeight(0.25);
      bezier(a.x, a.y,
        center.x + sin(j + scenePhase) * 45,
        center.y + cos(j) * 45,
        center.x - cos(j) * 48,
        center.y + sin(j) * 48,
        b.x + cut, b.y);
    }
  }

  pop();
}

function drawScene() {
  if (sceneMode === 0) return;
  noFill();

  if (sceneMode === 1) {
    for (let band = 0; band < 9; band++) {
      const y = height * (band + 0.5) / 9;
      const shift = sceneDirection * sin(scenePhase * 2 + band) * width * 0.16;
      beginShape();
      fill(186, 191, 198, 9);
      stroke(band % 3 === 0 ? 255 : 192,
        band % 3 === 0 ? 24 : 198,
        band % 3 === 0 ? 48 : 208, 35 + sceneEnergy * 70);
      strokeWeight(band % 3 === 0 ? 1.8 : 0.7);
      vertex(-width * 0.1 + shift, y - 12);
      vertex(width * 0.22 + shift, y - 28);
      vertex(width * 0.46 + shift, y + 16);
      vertex(width * 0.72 + shift, y - 20);
      vertex(width * 1.1 + shift, y + 8);
      vertex(width * 1.1 + shift, y + 18);
      vertex(width * 0.73 + shift, y - 8);
      vertex(width * 0.45 + shift, y + 27);
      vertex(width * 0.21 + shift, y - 2);
      vertex(-width * 0.1 + shift, y + 14);
      endShape(CLOSE);
    }
  } else if (sceneMode === 2) {
    const size = min(width, height) * 0.17;
    for (let i = 0; i < 18; i++) {
      const x = (i % 6) * width / 5.2;
      const y = floor(i / 6) * height / 2.8;
      const alpha = 28 + sceneEnergy * 62;
      stroke(i % 6 === 0 ? 255 : 205, i % 6 === 0 ? 28 : 212,
        i % 6 === 0 ? 48 : 222, alpha);
      rectMode(CORNER);
      rect(x + sin(scenePhase * 2 + i) * 24, y, size * 0.78,
        size * (0.5 + abs(sin(i)) * 0.25));
    }
  } else if (sceneMode === 3) {
    push();
    translate(width * 0.5, height * 0.5);
    for (let i = 0; i < 14; i++) {
      const radius = i * min(width, height) * 0.045
        + (scenePhase * 36) % (min(width, height) * 0.045);
      const alpha = 40 + sceneEnergy * 45;
      stroke(i % 4 === 0 ? 255 : 205, i % 4 === 0 ? 28 : 212,
        i % 4 === 0 ? 48 : 220, alpha);
      ellipse(0, 0, radius * 2, radius * 1.25);
      line(-radius, 0, radius, 0);
    }
    pop();
  } else if (sceneMode === 4) {
    noFill();
    for (let i = 0; i < 9; i++) {
      const y = height * (i + 0.5) / 9;
      beginShape();
      stroke(i % 3 === 0 ? 255 : 190, i % 3 === 0 ? 28 : 198,
        i % 3 === 0 ? 48 : 208, 32 + sceneEnergy * 58);
      for (let x = -20; x <= width + 20; x += 32) {
        vertex(x, y + sin(x * 0.017 + scenePhase * 4 + i) * 34 * sceneEnergy);
      }
      endShape();
    }
  }

  noStroke();
  for (const line of glitchLine) {
    line.life *= 0.93;
    fill(235, 240, 246, 32 * line.life);
    rect(line.x, line.y, line.width * 0.72, random() > 0.5 ? 1 : 2);
    if (line.life < 0.02) continue;
  }

  if (cutFlash > 0.08) {
    fill(255, 28, 48, cutFlash * 28);
    rect(0, random(height), width, random(2, 12));
  }
}

function drawCarousel() {
  if (!carouselEnabled && fairgroundPulse < 0.04) return;
  push();
  translate(width * 0.5, height * 0.5);
  const rx = min(width, height) * 0.28;
  const ry = rx * 0.66;
  const intensity = carouselEnabled ? 1 : fairgroundPulse;

  noFill();
  stroke(210, 216, 226, 28 * intensity);
  strokeWeight(0.8);
  ellipse(0, 0, rx * 2, ry * 2);

  for (let i = 0; i < 16; i++) {
    const angle = i * TWO_PI / 16 + carouselAngle * 1.7;
    const x = cos(angle) * rx;
    const y = sin(angle) * ry;
    const broken = i % 5 === 2;
    const red = i % 8 === 0;

    stroke(red ? 255 : 205, red ? 28 : 212,
      red ? 48 : 222, (red ? 105 : 48) * intensity);
    line(x * 0.18, y * 0.18, x, y);

    push();
    translate(x, y);
    rotate(angle + HALF_PI);
    noFill();
    strokeWeight(red ? 1.1 : 0.65);
    rectMode(CENTER);
    rect(0, 0, broken ? 12 : 19, broken ? 7 : 13);
    pop();

    if (i % 2 === 0) {
      noStroke();
      fill(red ? 255 : 232, red ? 42 : 237, red ? 58 : 246,
        (red ? 210 : 115) * intensity);
      circle(x, y, 3 + fairgroundPulse * 5);
    }
  }

  noStroke();
  fill(255, 28, 48, 32 * intensity);
  circle(0, 0, 32 + fairgroundPulse * 18);
  pop();
}

function drawShockwaves() {
  noFill();
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const wave = shockwaves[i];
    wave.radius += 8;
    wave.life *= 0.955;
    stroke(255, 35, 55, 110 * wave.life);
    strokeWeight(1.2 * wave.life);
    circle(wave.x, wave.y, wave.radius * 2);
    stroke(225, 232, 242, 55 * wave.life);
    circle(wave.x + 3, wave.y - 2, wave.radius * 2);
    if (wave.life < 0.02) shockwaves.splice(i, 1);
  }
}

function drawRhythmLight() {
  if (beatAccent < 0.04) return;
  noStroke();
  fill(255, 28, 48, 15 * beatAccent);
  const band = (millis() % BEAT_MS) / BEAT_MS;
  rect(0, height * band - 1, width, 2);
  fill(235, 239, 245, 9 * beatAccent);
  rect(width * (1 - band) - 1, 0, 2, height);
}

function drawSceneSweep() {
  if (sceneSweep < 0.01 && strobeGate < 0.01) return;
  const position = (sceneSweep * sceneSweep * width) % (width * 1.4);
  noStroke();
  fill(255, 28, 48, 42 * sceneSweep);
  rect(position - 80, 0, 160, height);
  fill(235, 240, 246, 70 * strobeGate);
  rect(0, height * (0.5 + sin(millis() * 0.021) * 0.28), width, 1);
}

function burstGrid() {
  const rows = 5;
  const columns = 7;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      setTimeout(() => rupture(
        width * (x + 1) / (columns + 1),
        height * (y + 1) / (rows + 1),
        0.62
      ), (x + y) * 28);
    }
  }
}

function snapToCircle() {
  for (let i = 0; i < agents.length; i++) {
    const angle = TWO_PI * i / agents.length;
    const radius = min(width, height) * (0.26 + (i % 4) * 0.025);
    agents[i].velocity.add(p5.Vector.sub(
      createVector(width * 0.5 + cos(angle) * radius,
        height * 0.5 + sin(angle) * radius * 0.68),
      agents[i].position
    ).mult(0.018));
  }
}

function rupture(x = width * 0.5, y = height * 0.5, intensity = 1) {
  rupturePower = min(1.4, rupturePower + 0.65 * intensity);
  localRuptures.push({ x, y, radius: 12, life: min(1.5, intensity) });

  for (const agent of agents) {
    const from = p5.Vector.sub(agent.position, createVector(x, y));
    if (from.magSq() > 0.001) {
      from.normalize();
      from.mult(random(2.2, 5.2) * intensity);
      agent.velocity.add(from);
    }
  }

  const fragmentCount = floor(25 * intensity);
  for (let i = 0; i < fragmentCount; i++) {
    const angle = random(TWO_PI);
    const speed = random(1.2, 5.5);
    const maxLife = random(35, 90);
    fragments.push({
      position: createVector(x + random(-24, 24), y + random(-24, 24)),
      velocity: p5.Vector.fromAngle(angle).mult(speed),
      life: maxLife,
      maxLife,
      size: random(0.8, 3.4)
    });
  }
}

function mouseMoved() {
  if (mouseIsPressed) return false;
  return false;
}

function mouseDragged() {
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return false;
  dragPulse = 1;
  dragPoints.push({ x: mouseX, y: mouseY, life: 1 });
  if (dragPoints.length > 54) dragPoints.shift();
  if (frameCount % 5 === 0) {
    shockwaves.push({ x: mouseX, y: mouseY, radius: 4, life: 0.32 });
  }
  return false;
}

function drawDragTrace() {
  if (!dragPoints.length) return;
  noFill();
  beginShape();
  stroke(198, 204, 214, 38);
  strokeWeight(0.8);
  for (const point of dragPoints) {
    point.life *= 0.965;
    curveVertex(point.x, point.y);
  }
  endShape();

  for (const point of dragPoints) {
    noStroke();
    fill(255, 28, 48, 20 * point.life);
    circle(point.x, point.y, 7 * point.life);
  }
  dragPoints = dragPoints.filter(point => point.life > 0.08);
}

function mousePressed() {
  dragPoints = [];
  rupture(mouseX, mouseY, 1.15);
  return false;
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
    setVolume(5);
  } else if (keyCode === DOWN_ARROW) {
    setVolume(-5);
  } else if (keyCode === ENTER) {
    playTrack();
  } else if (key === "r" || key === "R") {
    resetOrganism();
    restartTrack();
  } else if (key === " ") {
    rupture(width * 0.5, height * 0.5, 2.4);
    shockwaves.push({ x: width * 0.5, y: height * 0.5, radius: 15, life: 1.2 });
  } else if (key === "1") {
    rhythmMode = 1;
  } else if (key === "2") {
    rhythmMode = 2;
  } else if (key === "3") {
    rhythmMode = 3;
  } else if (key === "q" || key === "Q") {
    sequence(7, random(TWO_PI));
  } else if (key === "w" || key === "W") {
    for (const c of clusters) {
      c.baseX = constrain(width * 0.5 + (c.baseX - width * 0.5) * 1.22, 20, width - 20);
      c.baseY = constrain(height * 0.5 + (c.baseY - height * 0.5) * 1.22, 20, height - 20);
    }
  } else if (key === "e" || key === "E") {
    for (const c of clusters) {
      c.baseX = width * 0.5 + (random() - 0.5) * min(width, height) * 0.52;
      c.baseY = height * 0.5 + (random() - 0.5) * min(width, height) * 0.52;
    }
  } else if (key === "a" || key === "A") {
    flowAngle += PI * 0.5;
  } else if (key === "d" || key === "D") {
    flowAngle -= PI * 0.5;
  } else if (key === "z" || key === "Z") {
    for (const agent of agents) agent.trail = [];
  } else if (key === "x" || key === "X") {
    shockwaves = [];
  } else if (key === "c" || key === "C") {
    carouselEnabled = !carouselEnabled;
    carouselSpeed = 0.0022 + random(-0.0007, 0.0012);
  } else if (key === "f" || key === "F") {
    carouselEnabled = !carouselEnabled;
    carouselSpeed *= -1;
  } else if (key === "v" || key === "V") {
    carouselSpeed *= 1.35;
  } else if (key === "b" || key === "B") {
    carouselSpeed *= 0.72;
  } else if (key === "n" || key === "N") {
    orbitGate = orbitGate > 0.62 ? 0.42 : 1;
  } else if (key === "m" || key === "M") {
    orbitGate = orbitGate > 1.28 ? 0.62 : 1.48;
  } else if (key === "g" || key === "G") {
    orbitFlip *= -1;
  } else if (key === "h" || key === "H") {
    vortexPower = 1;
    vortexAngle = random(TWO_PI);
  } else if (key === "j" || key === "J") {
    mechanicalJitter = 1;
  } else if (key === "k" || key === "K") {
    clusterCollapse = 1;
  } else if (key === "l" || key === "L") {
    clusterCollapse = 0;
    scatterMode = 1;
  } else if (key === "i" || key === "I") {
    symmetryMode = symmetryMode === 1 ? 2 : 1;
  } else if (key === "o" || key === "O") {
    strobeGate = 1;
  } else if (key === "t" || key === "T") {
    trailEcho = trailEcho > 8 ? 3 : 12;
  } else if (key === "u" || key === "U") {
    sceneSweep = 1;
  } else if (key === "y" || key === "Y") {
    burstGrid();
  } else if (key === "p" || key === "P") {
    snapToCircle();
  } else if (key === "[") {
    carouselSpeed -= 0.0005;
  } else if (key === "]") {
    carouselSpeed += 0.0005;
  } else if (key === "-") {
    rhythmMode = max(1, rhythmMode - 1);
  } else if (key === "=") {
    rhythmMode = min(3, rhythmMode + 1);
  } else if (key === "7") {
    activateScene(1);
  } else if (key === "8") {
    activateScene(2);
  } else if (key === "9") {
    activateScene(3);
  } else if (key === "0") {
    activateScene(4);
  } else if (key === "s" || key === "S") {
    activateScene(0);
  }
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  for (const c of clusters) {
    c.baseX = constrain(c.baseX, 20, width - 20);
    c.baseY = constrain(c.baseY, 20, height - 20);
  }
  background(3, 3, 4);
}
