import * as THREE from 'three';

/**
 * Three.js 3D Cinema Auditorium Engine
 * Features:
 * - Curved Cinema Screen with glow & ambient illumination
 * - Tiered stadium risers with stepped seating elevation
 * - Instanced/Grouped 3D cinema seats with realistic armrests and seat geometry
 * - Color-coded live state: Available (Tier colors), Selected (Emerald), Booked (Crimson), Locked (Amber)
 * - Raycaster mouse interaction for hover tooltip and click-to-select
 * - Smooth camera Lerp animations for "View From Seat" sightline perspective and reset
 */
export class SeatMap3D {
  constructor(container, options = {}) {
    this.container = container;
    this.rows = options.rows || []; // Array of { row, tier, seats: [ { id, row, number, tier, status, price } ] }
    this.selectedIds = new Set(options.selectedIds || []);
    this.onToggle = options.onToggle || (() => {});
    this.onHoverSeat = options.onHoverSeat || (() => {});

    // Flat seat lookup
    this.seatList = [];
    this.seatMap = new Map();

    // Scene & Rendering essentials
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationFrameId = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    // Camera viewpoints
    this.defaultCameraPos = new THREE.Vector3(0, 10, 16);
    this.defaultCameraTarget = new THREE.Vector3(0, 2, -2);
    this.currentTarget = this.defaultCameraTarget.clone();
    this.targetCameraPos = this.defaultCameraPos.clone();
    this.targetLookAt = this.defaultCameraTarget.clone();
    this.isLerpingCamera = false;
    this.viewMode = 'orbit'; // 'orbit' | 'seat'

    // Mouse drag orbit controls (custom lightweight, zero-dependency)
    this.isMouseDown = false;
    this.prevMousePos = { x: 0, y: 0 };
    this.spherical = { radius: 20, theta: 0, phi: Math.PI / 4 };

    // Meshes
    this.seatMeshes = [];
    this.screenMesh = null;
    this.hoveredSeatId = null;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 500;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14);
    this.scene.fog = new THREE.FogExp2(0x070b14, 0.035);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.copy(this.defaultCameraPos);
    this.camera.lookAt(this.defaultCameraTarget);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Environment & Cinema Screen
    this.buildAuditoriumEnvironment();

    // 6. Seats
    this.seatsRootGroup = new THREE.Group();
    this.scene.add(this.seatsRootGroup);
    this.buildSeats();

    // 7. Event listeners
    this.setupEventListeners();

    // 8. Animation loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  setupLighting() {
    // Ambient Cinema Glow
    const ambientLight = new THREE.AmbientLight(0x1a2639, 1.8);
    this.scene.add(ambientLight);

    // Overhead subtle warm hall lights
    const ceilingLight = new THREE.DirectionalLight(0x7dd3fc, 0.8);
    ceilingLight.position.set(0, 15, 5);
    this.scene.add(ceilingLight);

    // Screen projector glow pointing towards the audience
    const screenGlowLight = new THREE.SpotLight(0x38bdf8, 4.0, 30, Math.PI / 3, 0.4, 1.2);
    screenGlowLight.position.set(0, 4, -8);
    screenGlowLight.target.position.set(0, 2, 8);
    this.scene.add(screenGlowLight);
    this.scene.add(screenGlowLight.target);

    // Aisle floor safety strip lights
    const aisleLightLeft = new THREE.PointLight(0x06b6d4, 1.2, 18);
    aisleLightLeft.position.set(-6, 0.2, 5);
    this.scene.add(aisleLightLeft);

    const aisleLightRight = new THREE.PointLight(0x06b6d4, 1.2, 18);
    aisleLightRight.position.set(6, 0.2, 5);
    this.scene.add(aisleLightRight);
  }

  buildAuditoriumEnvironment() {
    // Carpet Floor with stepped gradient
    const floorGeo = new THREE.PlaneGeometry(32, 34);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x090e18,
      roughness: 0.9,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    this.scene.add(floor);

    // Curved IMAX Screen
    // Build a curved cylindrical surface
    const screenWidth = 20;
    const screenHeight = 6.8;
    const curveRadius = 24;
    const curveAngle = screenWidth / curveRadius; // radians

    const screenGeo = new THREE.CylinderGeometry(
      curveRadius,
      curveRadius,
      screenHeight,
      48,
      1,
      true,
      -curveAngle / 2 + Math.PI / 2,
      curveAngle
    );

    // Screen Material with emissive movie illumination
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(0.3, '#38bdf8');
    grad.addColorStop(0.6, '#818cf8');
    grad.addColorStop(1, '#c084fc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Screen text/logo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CINEMA CURVED EXPERIENCE — IMAX LASER', 512, 240);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('IMMERSIVE SIGHTLINE PREVIEW', 512, 280);

    const screenTexture = new THREE.CanvasTexture(canvas);
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTexture,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.screenMesh = new THREE.Mesh(screenGeo, screenMat);
    this.screenMesh.position.set(0, 3.8, -8 - curveRadius);
    this.screenMesh.rotation.y = Math.PI;
    this.scene.add(this.screenMesh);

    // Screen border frame
    const frameGeo = new THREE.BoxGeometry(screenWidth + 0.6, screenHeight + 0.5, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x050810, roughness: 0.9 });
    const screenFrame = new THREE.Mesh(frameGeo, frameMat);
    screenFrame.position.set(0, 3.8, -8.2);
    this.scene.add(screenFrame);

    // "SCREEN" glowing floor badge
    const badgeGeo = new THREE.PlaneGeometry(6, 0.6);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.8 });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.rotation.x = -Math.PI / 2;
    badge.position.set(0, 0.02, -7.5);
    this.scene.add(badge);
  }

  buildSeats() {
    this.seatList = [];
    this.seatMap.clear();
    this.seatMeshes = [];

    if (!this.seatsRootGroup) {
      this.seatsRootGroup = new THREE.Group();
      this.scene.add(this.seatsRootGroup);
    } else {
      this.seatsRootGroup.clear();
    }

    if (!this.rows || this.rows.length === 0) return;

    // Total rows and layout geometry
    const totalRows = this.rows.length;
    const rowDepth = 1.35; // Distance between rows
    const startZ = -3.5;   // Front row Z position

    // Tier elevation stepping (stadium seating curve)
    // Front row is at y=0, each row rises smoothly
    const getRowElevation = (rowIndex) => {
      return rowIndex * 0.32 + Math.pow(rowIndex, 1.4) * 0.04;
    };

    // Shared seat geometry components for sleek cinema chairs
    const cushionGeo = new THREE.BoxGeometry(0.64, 0.14, 0.58);
    const backrestGeo = new THREE.BoxGeometry(0.62, 0.68, 0.14);
    const armrestGeo = new THREE.BoxGeometry(0.1, 0.36, 0.5);

    // Stepped Riser platform for each row
    this.rows.forEach((rowObj, rIndex) => {
      const rowElevation = getRowElevation(rIndex);
      const rowZ = startZ + rIndex * rowDepth;
      const seatsCount = rowObj.seats.length;
      const totalRowWidth = seatsCount * 0.92;

      // Concrete riser step
      const riserGeo = new THREE.BoxGeometry(totalRowWidth + 1.2, 0.22, rowDepth);
      const riserMat = new THREE.MeshStandardMaterial({
        color: 0x0e1726,
        roughness: 0.85,
      });
      const riser = new THREE.Mesh(riserGeo, riserMat);
      riser.position.set(0, rowElevation - 0.11, rowZ);
      this.seatsRootGroup.add(riser);

      // Row curve factor (gentle wrap around the screen)
      const curveIntensity = 0.025;

      rowObj.seats.forEach((seat, sIndex) => {
        // Seat X spacing with center aisle offset
        const centerOffset = (sIndex - (seatsCount - 1) / 2) * 0.92;
        // Subtle curve depth offset
        const curveZOffset = Math.pow(centerOffset, 2) * curveIntensity;
        const seatX = centerOffset;
        const seatY = rowElevation + 0.18;
        const seatZ = rowZ + curveZOffset;

        // Angle seat slightly toward center screen
        const rotY = -centerOffset * 0.025;

        // Seat Group
        const seatGroup = new THREE.Group();
        seatGroup.position.set(seatX, seatY, seatZ);
        seatGroup.rotation.y = rotY;

        // Colors based on seat status and tier
        const material = this.getSeatMaterial(seat);

        // Cushion
        const cushion = new THREE.Mesh(cushionGeo, material);
        cushion.position.set(0, 0.12, 0);
        cushion.castShadow = true;
        seatGroup.add(cushion);

        // Backrest (tilted slightly back for comfort)
        const backrest = new THREE.Mesh(backrestGeo, material);
        backrest.position.set(0, 0.48, -0.22);
        backrest.rotation.x = -0.12;
        seatGroup.add(backrest);

        // Armrests
        const armrestMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
        const armLeft = new THREE.Mesh(armrestGeo, armrestMat);
        armLeft.position.set(-0.35, 0.26, 0);
        seatGroup.add(armLeft);

        const armRight = new THREE.Mesh(armrestGeo, armrestMat);
        armRight.position.set(0.35, 0.26, 0);
        seatGroup.add(armRight);

        // Headrest for VIP Recliner & Premium
        if (seat.tier === 'recliner' || seat.tier === 'premium') {
          const headrestGeo = new THREE.BoxGeometry(0.5, 0.2, 0.12);
          const headrest = new THREE.Mesh(headrestGeo, material);
          headrest.position.set(0, 0.88, -0.26);
          seatGroup.add(headrest);
        }

        // Invisible Bounding Box for Raycasting clicks & hover detection
        const hitBoxGeo = new THREE.BoxGeometry(0.85, 1.0, 0.8);
        const hitBoxMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        const hitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
        hitBox.position.set(0, 0.45, 0);
        hitBox.userData = {
          seatId: seat.id,
          seatData: seat,
          seatGroup: seatGroup,
          worldPos: new THREE.Vector3(seatX, seatY, seatZ),
        };
        seatGroup.add(hitBox);

        this.seatsRootGroup.add(seatGroup);

        // Register seat
        const seatRecord = {
          seat,
          seatGroup,
          hitBox,
          material,
          position: new THREE.Vector3(seatX, seatY, seatZ),
          rotationY: rotY,
        };

        this.seatList.push(seatRecord);
        this.seatMap.set(seat.id, seatRecord);
        this.seatMeshes.push(hitBox);
      });
    });
  }

  getSeatColor(seat) {
    const isSelected = this.selectedIds.has(seat.id) || seat.status === 'my_locked';

    if (isSelected) {
      return 0x10b981; // Emerald Green for chosen seats
    }

    if (seat.status === 'booked') {
      return 0xef4444; // Crimson Red for booked
    }

    if (seat.status === 'locked_by_other' || seat.status === 'LOCKED') {
      return 0xf97316; // Amber Orange for locked by others
    }

    // Available tiers
    switch (seat.tier) {
      case 'recliner':
        return 0xf59e0b; // Gold Amber
      case 'premium':
        return 0xa855f7; // Royal Purple
      case 'regular':
      default:
        return 0x06b6d4; // Cyan Neon
    }
  }

  getSeatMaterial(seat) {
    const colorHex = this.getSeatColor(seat);
    const isSelected = this.selectedIds.has(seat.id) || seat.status === 'my_locked';
    const isBooked = seat.status === 'booked';

    return new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: isBooked ? 0.9 : 0.45,
      metalness: 0.15,
      emissive: isSelected ? 0x10b981 : 0x000000,
      emissiveIntensity: isSelected ? 0.4 : 0.0,
    });
  }

  updateSeatMaterials() {
    this.seatList.forEach(({ seat, material, seatGroup }) => {
      const colorHex = this.getSeatColor(seat);
      const isSelected = this.selectedIds.has(seat.id) || seat.status === 'my_locked';

      // 1. Direct material update
      if (material) {
        if (material.color) {
          material.color.setHex(colorHex);
        }
        if (material.emissive) {
          if (isSelected) {
            material.emissive.setHex(0x10b981);
            material.emissiveIntensity = 0.45;
          } else {
            material.emissive.setHex(0x000000);
            material.emissiveIntensity = 0.0;
          }
        }
      }

      // 2. Safe traversal for child meshes (skip armrests and hitboxes)
      if (seatGroup && seatGroup.children) {
        seatGroup.children.forEach((child) => {
          if (!child || !child.material) return;
          // Skip raycast hitBox (has seatId in userData)
          if (child.userData && child.userData.seatId) return;
          // Skip armrests (width === 0.1)
          if (child.geometry?.parameters?.width === 0.1) return;

          if (child.material.color) {
            child.material.color.setHex(colorHex);
          }
          if (child.material.emissive) {
            if (isSelected) {
              child.material.emissive.setHex(0x10b981);
              child.material.emissiveIntensity = 0.45;
            } else {
              child.material.emissive.setHex(0x000000);
              child.material.emissiveIntensity = 0.0;
            }
          }
        });
      }
    });
  }

  setSelected(selectedIds) {
    this.selectedIds = new Set(selectedIds);
    this.updateSeatMaterials();
  }

  updateSeatsData(rows) {
    this.rows = rows;
    this.buildSeats();
  }

  // "View From Seat" Camera Fly-through
  viewFromSeat(seatId) {
    const record = this.seatMap.get(seatId);
    if (!record) return;

    this.viewMode = 'seat';
    const seatPos = record.position;

    // Place camera right at spectator eye-level
    this.targetCameraPos.set(seatPos.x, seatPos.y + 0.65, seatPos.z + 0.15);
    // Look directly at screen center
    this.targetLookAt.set(0, 3.8, -8);
    this.isLerpingCamera = true;
  }

  // Restore wide auditorium orbit overview
  resetView() {
    this.viewMode = 'orbit';
    this.targetCameraPos.copy(this.defaultCameraPos);
    this.targetLookAt.copy(this.defaultCameraTarget);
    this.isLerpingCamera = true;
  }

  setupEventListeners() {
    const dom = this.renderer.domElement;

    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.container || !this.camera || !this.renderer) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width && height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
      }
    });
    this.resizeObserver.observe(this.container);

    // Mouse movement for Raycasting & drag orbit
    this.onMouseMove = (e) => {
      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Orbit camera dragging
      if (this.isMouseDown && this.viewMode === 'orbit') {
        const deltaX = e.clientX - this.prevMousePos.x;
        const deltaY = e.clientY - this.prevMousePos.y;

        this.spherical.theta -= deltaX * 0.005;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI / 2.1, this.spherical.phi - deltaY * 0.005));

        this.updateCameraFromSpherical();

        this.prevMousePos = { x: e.clientX, y: e.clientY };
      } else {
        // Raycast hover
        this.checkHover(e.clientX - rect.left, e.clientY - rect.top);
      }
    };

    this.onMouseDown = (e) => {
      this.isMouseDown = true;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    };

    this.onMouseUp = () => {
      this.isMouseDown = false;
    };

    this.onClick = (e) => {
      const rect = dom.getBoundingClientRect();
      const mX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(new THREE.Vector2(mX, mY), this.camera);
      const intersects = this.raycaster.intersectObjects(this.seatMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const { seatId, seatData } = hit.object.userData;

        // Disallow booked or other-locked seats
        if (seatData.status === 'booked' || seatData.status === 'locked_by_other') {
          return;
        }

        this.onToggle(seatId);
      }
    };

    dom.addEventListener('mousemove', this.onMouseMove);
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('click', this.onClick);
  }

  checkHover(clientX, clientY) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.seatMeshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const { seatId, seatData } = hit.object.userData;

      this.hoveredSeatId = seatId;
      this.renderer.domElement.style.cursor =
        seatData.status === 'booked' || seatData.status === 'locked_by_other' ? 'not-allowed' : 'pointer';

      this.onHoverSeat({
        seat: seatData,
        x: clientX,
        y: clientY,
        visible: true,
      });
    } else {
      if (this.hoveredSeatId) {
        this.hoveredSeatId = null;
        this.renderer.domElement.style.cursor = 'grab';
        this.onHoverSeat({ visible: false });
      }
    }
  }

  updateCameraFromSpherical() {
    const x = this.spherical.radius * Math.sin(this.spherical.phi) * Math.sin(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z = this.spherical.radius * Math.sin(this.spherical.phi) * Math.cos(this.spherical.theta);

    this.targetCameraPos.set(x, Math.max(3, y), z);
    this.targetLookAt.copy(this.defaultCameraTarget);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Smooth Lerp for camera transitions ("View From Seat" or reset)
    if (this.isLerpingCamera || this.viewMode === 'orbit') {
      this.camera.position.lerp(this.targetCameraPos, 0.08);
      this.currentTarget.lerp(this.targetLookAt, 0.08);
      this.camera.lookAt(this.currentTarget);

      if (this.camera.position.distanceTo(this.targetCameraPos) < 0.05) {
        this.isLerpingCamera = false;
      }
    }

    // Subtle gentle screen flicker to simulate vibrant movie projection
    if (this.screenMesh && this.screenMesh.material && typeof this.screenMesh.material.emissiveIntensity === 'number') {
      const time = Date.now() * 0.002;
      this.screenMesh.material.emissiveIntensity = 0.52 + Math.sin(time) * 0.06;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('mousemove', this.onMouseMove);
      dom.removeEventListener('mousedown', this.onMouseDown);
      window.removeEventListener('mouseup', this.onMouseUp);
      dom.removeEventListener('click', this.onClick);
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    }

    // Dispose scene materials and geometries
    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
