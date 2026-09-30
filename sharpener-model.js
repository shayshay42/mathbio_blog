import * as THREE from './assets/vendor/three.module.js';

// All parts share one coordinate system: y is up; the pencil enters at +z.
// Clamp, drawer and crank move as separate assemblies around a fixed body.
export function createSharpener() {
  const group = new THREE.Group();
  group.name = 'Carl Angel-5';

  const enamel = new THREE.MeshStandardMaterial({ color: '#aa3532', metalness: 0.24, roughness: 0.3 });
  const enamelEdge = new THREE.MeshStandardMaterial({ color: '#922b29', metalness: 0.2, roughness: 0.38 });
  const enamelMaterials = [enamel, enamelEdge];
  const chrome = new THREE.MeshStandardMaterial({ color: '#d9d9cd', metalness: 0.73, roughness: 0.24 });
  const satin = new THREE.MeshStandardMaterial({ color: '#a7aba5', metalness: 0.64, roughness: 0.38 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: '#60665e', metalness: 0.55, roughness: 0.36 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#252722', metalness: 0.03, roughness: 0.63 });
  const black = new THREE.MeshStandardMaterial({ color: '#151b17', roughness: 0.8 });
  const inside = new THREE.MeshStandardMaterial({ color: '#8c897c', metalness: 0.15, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({
    color: '#e5eddf', metalness: 0.05, roughness: 0.18, transparent: true,
    opacity: 0.19, depthWrite: false, side: THREE.DoubleSide,
  });
  const glassEdge = new THREE.MeshStandardMaterial({
    color: '#ccd4c7', metalness: 0.1, roughness: 0.26, transparent: true,
    opacity: 0.65, depthWrite: false,
  });

  const mesh = (geometry, material, name, parent = group) => {
    const part = new THREE.Mesh(geometry, material);
    part.name = name;
    part.castShadow = !material.transparent;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  };

  const roundedPath = (width, height, radius, centerX = 0, centerY = 0, hole = false) => {
    const s = hole ? new THREE.Path() : new THREE.Shape();
    const left = centerX - width / 2, right = centerX + width / 2;
    const bottom = centerY - height / 2, top = centerY + height / 2;
    s.moveTo(left + radius, bottom);
    s.lineTo(right - radius, bottom);
    s.quadraticCurveTo(right, bottom, right, bottom + radius);
    s.lineTo(right, top - radius);
    s.quadraticCurveTo(right, top, right - radius, top);
    s.lineTo(left + radius, top);
    s.quadraticCurveTo(left, top, left, top - radius);
    s.lineTo(left, bottom + radius);
    s.quadraticCurveTo(left, bottom, left + radius, bottom);
    s.closePath();
    return s;
  };

  const extrude = (shape, depth, bevel = 0.025) => new THREE.ExtrudeGeometry(shape, {
    depth, steps: 1, curveSegments: 12, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
  });

  const box = (width, height, depth, radius, material, name, position, parent = group) => {
    radius = Math.min(radius, width / 2, height / 2);
    const bevel = Math.min(radius * 0.4, depth * 0.22);
    const shape = roundedPath(width - bevel * 2, height - bevel * 2, Math.max(0.004, radius - bevel));
    const part = mesh(extrude(shape, depth - bevel * 2, bevel), material, name, parent);
    part.position.set(position[0], position[1], position[2] - depth / 2 + bevel);
    return part;
  };

  const cylinder = (radius, length, material, name, position, parent = group, segments = 40) => {
    const part = mesh(new THREE.CylinderGeometry(radius, radius, length, segments), material, name, parent);
    part.rotation.x = Math.PI / 2;
    part.position.set(...position);
    return part;
  };

  const ring = (radius, tube, material, name, position, parent = group) => {
    const part = mesh(new THREE.TorusGeometry(radius, tube, 10, 48), material, name, parent);
    part.position.set(...position);
    return part;
  };

  // A continuous folded-metal shell avoids independent, misaligned top corners.
  // The drawer aperture passes through this profile; a recessed rear panel closes it.
  const shellProfile = roundedPath(1.41, 2.06, 0.155);
  shellProfile.holes.push(roundedPath(1.25, 0.9, 0.032, 0, -0.5, true));
  const shell = mesh(extrude(shellProfile, 1.34, 0.045), enamel, 'Continuous rounded enamel shell');
  shell.position.z = -0.67;
  box(1.405, 2.05, 0.07, 0.155, enamel, 'Rear enamel panel', [0, 0, -0.665]);
  box(1.18, 0.8, 0.035, 0.025, inside, 'Recessed drawer cavity', [0, -0.49, -0.51]);
  box(1.15, 0.055, 1.13, 0.02, darkMetal, 'Drawer support', [0, -0.915, 0.11]);

  // Four low pads sit on the same plane; the shell rests directly over them.
  for (const x of [-0.54, 0.54]) {
    for (const z of [-0.49, 0.48]) {
      box(0.24, 0.10, 0.26, 0.05, rubber, 'Low rubber foot', [x, -1.105, z]);
    }
  }

  // Pulling the front housing exposes its guide rails and the recessed feed
  // mechanism. The rear cover stays with the enamel body, behind the moving plate.
  box(1.13, 0.92, 0.025, 0.1, satin, 'Fixed front mechanism surround', [0, 0.49, 0.719]);
  box(1.035, 0.81, 0.017, 0.074, inside, 'Recess behind the pencil clamp', [0, 0.49, 0.738]);
  cylinder(0.15, 0.025, black, 'Recessed pencil feed opening', [0, 0.487, 0.755]);
  ring(0.15, 0.025, darkMetal, 'Fixed pencil feed collar', [0, 0.487, 0.775]);
  const guides = [-0.46, 0.46].map(x => {
    cylinder(0.058, 0.035, darkMetal, 'Clamp guide-rail socket', [x, 0.82, 0.749]);
    return cylinder(0.027, 1, chrome, 'Sliding chrome clamp guide rail', [x, 0.82, 0.749]);
  });

  const clamp = new THREE.Group();
  clamp.name = 'Pull-out pencil clamp';
  clamp.userData.action = 'clamp';
  group.add(clamp);
  // The bowed chrome face, pencil aperture and both black feed tabs travel
  // together. Their closed positions retain the original fitted silhouette.
  box(1.29, 1.095, 0.115, 0.17, rubber, 'Clamp backing', [0, 0.49, 0.728], clamp);
  const plateProfile = new THREE.Shape();
  plateProfile.moveTo(-0.43, 0.46);
  plateProfile.lineTo(0.43, 0.46);
  plateProfile.quadraticCurveTo(0.535, 0.46, 0.55, 0.35);
  plateProfile.lineTo(0.612, -0.30);
  plateProfile.quadraticCurveTo(0.627, -0.44, 0.49, -0.46);
  plateProfile.quadraticCurveTo(0, -0.515, -0.49, -0.46);
  plateProfile.quadraticCurveTo(-0.627, -0.44, -0.612, -0.30);
  plateProfile.lineTo(-0.55, 0.35);
  plateProfile.quadraticCurveTo(-0.535, 0.46, -0.43, 0.46);
  const pencilHole = new THREE.Path();
  pencilHole.absarc(0, -0.018, 0.106, 0, Math.PI * 2, true);
  plateProfile.holes.push(pencilHole);
  const plateGeometry = extrude(plateProfile, 0.059, 0.021);
  const platePositions = plateGeometry.attributes.position;
  const plateNormals = plateGeometry.attributes.normal;
  for (let i = 0; i < platePositions.count; i++) {
    const x = platePositions.getX(i), y = platePositions.getY(i);
    const bowX = Math.max(0, 1 - (x / 0.65) ** 2);
    const bowY = Math.max(0, 1 - (y / 0.62) ** 2);
    const bow = 0.047 * bowX * bowY;
    platePositions.setZ(i, platePositions.getZ(i) + bow);
    // Transform the original smooth cap normals with the same curvature.
    // Recomputing per triangle would show the cap's triangulation in the chrome.
    const dx = bowX > 0 ? -0.094 * x / (0.65 ** 2) * bowY : 0;
    const dy = bowY > 0 ? -0.094 * y / (0.62 ** 2) * bowX : 0;
    const nx = plateNormals.getX(i), ny = plateNormals.getY(i), nz = plateNormals.getZ(i);
    const normal = new THREE.Vector3(nx - dx * nz, ny - dy * nz, nz).normalize();
    plateNormals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  const plate = mesh(plateGeometry, chrome, 'Bowed chrome pencil clamp', clamp);
  plate.position.set(0, 0.505, 0.802);
  cylinder(0.088, 0.105, black, 'Dark pencil aperture', [0, 0.487, 0.828], clamp);
  ring(0.104, 0.02, chrome, 'Pencil aperture lip', [0, 0.487, 0.916], clamp);
  ring(0.087, 0.008, darkMetal, 'Inner pencil guide', [0, 0.487, 0.912], clamp);

  // Both feed tabs use the same height and depth, anchored to the front mechanism.
  for (const x of [-0.30, 0.30]) {
    box(0.12, 0.19, 0.12, 0.017, satin, 'Feed-tab stem', [x, 1.032, 0.717], clamp);
    box(0.245, 0.23, 0.225, 0.026, rubber, 'Black pencil-feed tab', [x, 1.163, 0.717], clamp);
  }
  box(0.71, 0.014, 0.27, 0.045, satin, 'Inset top maker plate', [0, 1.079, -0.13]);

  // Clear drawer: thin individual walls preserve its empty volume and visible contents.
  const drawer = new THREE.Group();
  drawer.name = 'Clear removable shavings drawer';
  drawer.userData.action = 'drawer';
  group.add(drawer);
  const front = box(1.165, 0.815, 0.029, 0.024, glass, 'Clear drawer face', [0, -0.5, 0.763], drawer);
  front.renderOrder = 3;
  for (const x of [-0.572, 0.572]) {
    const wall = box(0.025, 0.78, 1.14, 0.005, glass, 'Clear drawer side', [x, -0.50, 0.185], drawer);
    wall.renderOrder = 2;
  }
  const floor = box(1.13, 0.022, 1.14, 0.006, glass, 'Clear drawer floor', [0, -0.884, 0.185], drawer);
  floor.renderOrder = 2;
  const back = box(1.13, 0.78, 0.025, 0.006, glass, 'Clear drawer back wall', [0, -0.5, -0.385], drawer);
  back.renderOrder = 2;
  // Moulded edges are solid enough to read at the small homepage size.
  for (const x of [-0.568, 0.568]) {
    box(0.022, 0.795, 0.031, 0.009, glassEdge, 'Drawer vertical edge', [x, -0.5, 0.784], drawer).renderOrder = 4;
  }
  for (const y of [-0.893, -0.107]) {
    box(1.14, 0.023, 0.031, 0.008, glassEdge, 'Drawer horizontal edge', [0, y, 0.784], drawer).renderOrder = 4;
  }
  // The small catch beneath the drawer is distinct from the pencil aperture above.
  cylinder(0.043, 0.018, black, 'Drawer retaining catch', [0, -0.997, 0.724]);

  const shavingColors = ['#d5ab70', '#e5c18b', '#ba8756', '#ecd2a2'];
  for (let i = 0; i < 5; i++) {
    const positions = [], indices = [];
    const count = 45, turns = 1.1 + i * 0.035;
    for (let j = 0; j <= count; j++) {
      const t = j / count, angle = t * Math.PI * 2 * turns;
      const r = 0.038 + t * 0.085;
      const width = 0.033 * (0.5 + 0.5 * Math.sin(t * Math.PI));
      for (const edge of [-1, 1]) {
        const rr = r + edge * width / 2;
        positions.push(Math.cos(angle) * rr, t * 0.055 + Math.sin(angle * 0.6) * 0.016, Math.sin(angle) * rr);
      }
      if (j < count) {
        const a = j * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: shavingColors[i % 4], roughness: 0.9, side: THREE.DoubleSide });
    const curl = mesh(geometry, material, 'Curled pencil shaving', drawer);
    curl.position.set(-0.36 + i * 0.175, -0.848 + (i % 2) * 0.018, 0.42 + (i % 2) * 0.13);
    curl.rotation.set(0.1 + i * 0.13, i * 1.3, 0.1 * (i - 2));
  }

  // A small screen-printed mark on the drawer, matching the physical product.
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 256;
  const context = labelCanvas.getContext('2d');
  context.fillStyle = '#fffdf2';
  context.textAlign = 'center';
  context.font = 'bold 94px Arial, sans-serif';
  context.fillText('CARL', 256, 115);
  context.font = 'italic 64px Arial, sans-serif';
  context.fillText('Angel-5', 256, 187);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const labelMaterial = new THREE.MeshStandardMaterial({ map: labelTexture, transparent: true, roughness: 0.75, depthWrite: false });
  const label = mesh(new THREE.PlaneGeometry(0.72, 0.36), labelMaterial, 'CARL Angel-5 drawer mark', drawer);
  label.position.set(0, -0.713, 0.807);
  label.renderOrder = 5;
  label.castShadow = false;

  // Rear drive shaft, then one flat crank assembly rotating about that shaft.
  cylinder(0.169, 0.055, enamelEdge, 'Rear shaft mounting boss', [0, 0.48, -0.731]);
  cylinder(0.107, 0.255, satin, 'Rear drive axle', [0, 0.48, -0.839]);
  ring(0.116, 0.023, chrome, 'Rear axle collar', [0, 0.48, -0.778]);
  const crank = new THREE.Group();
  crank.name = 'Rotating rear crank';
  crank.userData.action = 'crank';
  crank.position.set(0, 0.48, -0.962);
  group.add(crank);
  cylinder(0.145, 0.13, chrome, 'Crank axle hub', [0, 0, -0.027], crank);
  cylinder(0.071, 0.014, darkMetal, 'Crank centre fastener', [0, 0, -0.101], crank);
  box(0.07, 0.014, 0.009, 0.003, black, 'Crank screw slot', [0, 0, -0.111], crank);
  const endX = 0.79, endY = -0.67;
  const armLength = Math.hypot(endX, endY);
  const armAngle = Math.atan2(endY, endX) - Math.PI / 2;
  const arm = box(0.193, armLength + 0.14, 0.065, 0.092, chrome, 'Flat rounded crank arm', [endX / 2, endY / 2, -0.087], crank);
  arm.rotation.z = armAngle;
  const armInset = box(0.07, armLength - 0.17, 0.008, 0.028, satin, 'Brushed crank-arm inset', [endX / 2, endY / 2, -0.125], crank);
  armInset.rotation.z = armAngle;
  cylinder(0.079, 0.155, satin, 'Handle spindle', [endX, endY, -0.168], crank);
  cylinder(0.10, 0.357, rubber, 'Black crank grip', [endX, endY, -0.399], crank, 32);
  for (let i = 0; i < 18; i++) {
    const angle = i / 18 * Math.PI * 2;
    cylinder(0.008, 0.303, rubber, 'Grip rib', [endX + Math.cos(angle) * 0.101, endY + Math.sin(angle) * 0.101, -0.399], crank, 6);
  }
  for (const z of [-0.232, -0.566]) {
    ring(0.092, 0.013, rubber, 'Rounded grip rim', [endX, endY, z], crank);
  }
  cylinder(0.088, 0.009, rubber, 'Grip end cap', [endX, endY, -0.578], crank);

  const colors = {
    red: ['#aa3532', '#8e2d2a'],
    blue: ['#397d94', '#2b6276'],
    black: ['#343b37', '#272d2a'],
    green: ['#47775b', '#315840'],
  };
  const setEnamel = (color) => {
    const palette = colors[color] || colors.red;
    enamelMaterials.forEach((material, i) => material.color.set(palette[i]));
  };

  const fractionOf = value => Number.isFinite(value) ? THREE.MathUtils.clamp(value, 0, 1) : 0;
  const setClampExtension = fraction => {
    const extension = fractionOf(fraction) * 0.5;
    clamp.position.z = extension;
    guides.forEach(guide => {
      // The short closed rail sits inside the backing, so exports retain it.
      guide.scale.y = extension + 0.015;
      guide.position.z = 0.729 + (extension + 0.015) / 2;
    });
  };
  const setDrawerExtension = fraction => { drawer.position.z = fractionOf(fraction) * 0.7; };
  setClampExtension(0);
  setDrawerExtension(0);

  return { group, crank, clamp, drawer, enamelMaterials, setEnamel, setClampExtension, setDrawerExtension };
}
