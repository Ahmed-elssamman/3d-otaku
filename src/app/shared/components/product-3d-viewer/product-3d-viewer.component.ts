import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild
} from '@angular/core';
import { ProductModelType } from '@core/enums/product-model-type.enum';
import { Product } from '@core/models/product.model';
import { getModelTypeFromPath } from '@core/constants/model-file.constants';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { VIEWER_FEATURES, VIEWER_RENDER_SETTINGS } from './product-3d-viewer.control';
import { AnalyticsService } from '@core/services/analytics.service';
import { AnalyticsEventName } from '@core/enums/analytics-event-name.enum';

@Component({
  selector: 'app-product-3d-viewer',
  standalone: true,
  templateUrl: './product-3d-viewer.component.html',
  styleUrl: './product-3d-viewer.component.scss'
})
export class Product3dViewerComponent implements AfterViewInit, OnDestroy {
  private ngZone = inject(NgZone);
  private analytics = inject(AnalyticsService);

  product = input<Product | null>(null);
  modelUrl = input<string>('');
  modelType = input<ProductModelType>(ProductModelType.GLB);
  modelName = input<string>('3D anime collectible');
  posterImage = input<string>('');
  compact = input<boolean>(false);

  viewerShellRef = viewChild<ElementRef<HTMLElement>>('viewerShell');
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('threeCanvas');

  isAutoRotating = signal<boolean>(true);
  isLoaded = signal<boolean>(false);
  hasError = signal<boolean>(false);
  errorMessage = signal<string>('');
  loadProgress = signal<number>(0);
  detectedFormat = signal<ProductModelType>(ProductModelType.GLB);
  isFullscreen = signal<boolean>(false);
  viewReady = signal<boolean>(false);

  resolvedModelUrl = computed(() => this.modelUrl().trim() || this.product()?.modelUrl?.trim() || '');
  resolvedModelName = computed(() => this.product()?.name || this.modelName());
  loadingLabel = computed(() => {
    const progress = this.loadProgress();
    return progress > 0 ? `Loading model ${progress}%` : 'Loading interactive model';
  });
  rotationActionLabel = computed(() => this.isAutoRotating() ? 'Pause rotation' : 'Start rotation');
  viewerFeatures = VIEWER_FEATURES;

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private currentObject: THREE.Object3D | null = null;
  private emberField: THREE.Points | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  private loadSequence = 0;
  private modelSize = 1;
  private elapsedTime = 0;
  private loadTimeoutId: number | null = null;

  constructor() {
    effect(onCleanup => {
      const modelPath = this.resolvedModelUrl();
      const ready = this.viewReady();
      const format = this.resolveFormat(modelPath);
      this.detectedFormat.set(format);

      if (!ready || !modelPath) {
        return;
      }

      const timerId = window.setTimeout(() => this.initializeViewer(modelPath, format));
      onCleanup(() => window.clearTimeout(timerId));
    });
  }

  ngAfterViewInit(): void {
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.isAutoRotating.set(false);
    }
    this.viewReady.set(true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    this.disposeViewer();
  }

  toggleAutoRotate(): void {
    this.isAutoRotating.update(value => !value);
    if (this.controls) {
      this.controls.autoRotate = this.isAutoRotating();
    }
  }

  resetCamera(): void {
    if (this.currentObject) {
      this.fitCameraToObject(this.currentObject);
    }
  }

  zoomIn(): void {
    this.adjustZoom(0.78);
  }

  zoomOut(): void {
    this.adjustZoom(1.28);
  }

  toggleFullscreen(): void {
    const shell = this.viewerShellRef()?.nativeElement;
    if (!shell) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void shell.requestFullscreen();
  }

  retryModel(): void {
    const modelPath = this.resolvedModelUrl();
    if (modelPath) {
      this.initializeViewer(modelPath, this.resolveFormat(modelPath));
    }
  }

  onWebglContextLost(event: Event): void {
    event.preventDefault();
    this.loadSequence += 1;
    this.clearLoadTimeout();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.handleModelError('The 3D graphics context was interrupted. The viewer will reload when it is restored.');
  }

  onWebglContextRestored(): void {
    this.retryModel();
  }

  private resolveFormat(path: string): ProductModelType {
    const detectedType = getModelTypeFromPath(path);
    if (detectedType) {
      return detectedType;
    }

    const productType = this.product()?.modelType?.toString().toUpperCase();
    const requestedType = productType || this.modelType();
    const matchingType = Object.values(ProductModelType).find(type => type === requestedType);
    return matchingType ?? ProductModelType.GLB;
  }

  private initializeViewer(modelPath: string, format: ProductModelType): void {
    const canvas = this.canvasRef()?.nativeElement;
    const shell = this.viewerShellRef()?.nativeElement;
    if (!canvas || !shell) {
      return;
    }

    if (!this.isSafeModelUrl(modelPath)) {
      this.handleModelError('The interactive model URL is not valid. Product photos and ordering remain available.');
      return;
    }

    if (!this.supportsWebGl()) {
      this.handleModelError('Interactive 3D is unavailable in this browser. You can continue using the product photos and details.');
      return;
    }

    this.disposeSceneResources();
    this.isLoaded.set(false);
    this.hasError.set(false);
    this.errorMessage.set('');
    this.loadProgress.set(0);
    this.loadSequence += 1;
    const activeLoad = this.loadSequence;

    const width = Math.max(shell.clientWidth, 320);
    const height = Math.max(shell.clientHeight, this.compact() ? 288 : 520);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.01, 5000);
    this.camera.position.set(0, 0.4, 5);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, VIEWER_RENDER_SETTINGS.maxPixelRatio));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.NoToneMapping;
      this.renderer.toneMappingExposure = 1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.065;
      this.controls.enablePan = false;
      this.controls.autoRotate = this.isAutoRotating();
      this.controls.autoRotateSpeed = VIEWER_RENDER_SETTINGS.autoRotateSpeed;

      this.addNeutralLights();
      this.createEmberField();
      this.observeViewerSize(shell);
      this.loadModel(modelPath, format, activeLoad);
      this.loadTimeoutId = window.setTimeout(() => {
        if (!this.isLoaded() && activeLoad === this.loadSequence) {
          this.handleModelError('The interactive model took too long to load. Product photos and ordering remain available.');
        }
      }, 30000);
      this.startRenderLoop();
    } catch {
      this.disposeSceneResources();
      this.handleModelError('Interactive 3D could not start. You can continue using the product photos and details.');
    }
  }

  private addNeutralLights(): void {
    if (!this.scene) {
      return;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.4);
    fillLight.position.set(-4, 2, 3);
    this.scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.1);
    backLight.position.set(1, 3, -5);
    this.scene.add(backLight);
  }

  private createEmberField(): void {
    if (!this.scene) {
      return;
    }

    const count = VIEWER_RENDER_SETTINGS.backgroundEmberCount;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 12;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xff6a00,
      size: 0.045,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.emberField = new THREE.Points(geometry, material);
    this.scene.add(this.emberField);
  }

  private loadModel(modelPath: string, format: ProductModelType, activeLoad: number): void {
    const complete = (object: THREE.Object3D): void => {
      if (activeLoad !== this.loadSequence) {
        this.disposeObject(object);
        return;
      }
      this.setupLoadedObject(object);
    };

    const fail = (): void => {
      if (activeLoad === this.loadSequence) {
        this.handleModelError();
      }
    };

    if (format === ProductModelType.STL) {
      new STLLoader().load(modelPath, geometry => {
        geometry.computeVertexNormals();
        complete(new THREE.Mesh(geometry, this.createFallbackMaterial(false)));
      }, event => this.updateLoadProgress(event), fail);
      return;
    }

    if (format === ProductModelType.OBJ) {
      new OBJLoader().load(modelPath, object => complete(object), event => this.updateLoadProgress(event), fail);
      return;
    }

    if (format === ProductModelType.PLY) {
      new PLYLoader().load(modelPath, geometry => {
        geometry.computeVertexNormals();
        const material = this.createFallbackMaterial(geometry.hasAttribute('color'));
        complete(new THREE.Mesh(geometry, material));
      }, event => this.updateLoadProgress(event), fail);
      return;
    }

    const loader = new GLTFLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      modelPath,
      (gltf: GLTF) => complete(gltf.scene),
      event => this.updateLoadProgress(event),
      fail
    );
  }

  private createFallbackMaterial(vertexColors: boolean): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xd8d8d8,
      metalness: 0,
      roughness: 0.65,
      vertexColors
    });
  }

  private updateLoadProgress(event: ProgressEvent): void {
    if (event.lengthComputable && event.total > 0) {
      const percentage = Math.min(99, Math.round((event.loaded / event.total) * 100));
      this.ngZone.run(() => this.loadProgress.set(percentage));
    }
  }

  private setupLoadedObject(object: THREE.Object3D): void {
    if (!this.scene) {
      return;
    }

    if (!this.hasRenderableGeometry(object)) {
      this.disposeObject(object);
      this.handleModelError(`This ${this.detectedFormat()} file does not contain renderable 3D geometry.`);
      return;
    }

    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    const initialBox = new THREE.Box3().setFromObject(object);
    const center = initialBox.getCenter(new THREE.Vector3());
    const size = initialBox.getSize(new THREE.Vector3());
    const bounds = [center.x, center.y, center.z, size.x, size.y, size.z];
    if (initialBox.isEmpty() || !bounds.every(value => Number.isFinite(value))) {
      this.disposeObject(object);
      this.handleModelError(`This ${this.detectedFormat()} file has invalid model dimensions.`);
      return;
    }
    object.position.sub(center);

    this.modelSize = Math.max(size.x, size.y, size.z, 1);
    this.currentObject = object;
    this.scene.add(object);
    this.addDisplayStage(size);
    this.fitCameraToObject(object);

    this.ngZone.run(() => {
      this.clearLoadTimeout();
      this.loadProgress.set(100);
      this.isLoaded.set(true);
      this.hasError.set(false);
    });
  }

  private hasRenderableGeometry(object: THREE.Object3D): boolean {
    let hasGeometry = false;
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      const positionAttribute = mesh.geometry?.getAttribute('position');
      if (mesh.isMesh && positionAttribute && positionAttribute.count > 0) {
        hasGeometry = true;
      }
    });
    return hasGeometry;
  }

  private addDisplayStage(size: THREE.Vector3): void {
    if (!this.scene) {
      return;
    }

    const radius = Math.max(size.x, size.z, this.modelSize * 0.55) * 0.78;
    const floorY = -(size.y / 2) - this.modelSize * 0.025;

    const floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x08030a,
      metalness: 0.48,
      roughness: 0.38,
      transparent: true,
      opacity: 0.88
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.35, 72), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3d00,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const auraRing = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.88, radius, 96),
      auraMaterial
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = floorY + this.modelSize * 0.006;
    this.scene.add(auraRing);
  }

  private fitCameraToObject(object: THREE.Object3D): void {
    if (!this.camera || !this.controls) {
      return;
    }

    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 1);
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * this.camera.aspect);
    const distanceForHeight = size.y / (2 * Math.tan(verticalFov / 2));
    const distanceForWidth = size.x / (2 * Math.tan(horizontalFov / 2));
    const cameraDistance = Math.max(distanceForHeight, distanceForWidth, maxDimension) * 1.28;

    this.camera.near = Math.max(maxDimension / 1000, 0.01);
    this.camera.far = Math.max(cameraDistance * 30, 100);
    this.camera.position.set(cameraDistance * 0.22, size.y * 0.08, cameraDistance);
    this.camera.updateProjectionMatrix();

    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = maxDimension * 0.55;
    this.controls.maxDistance = maxDimension * 8;
    this.controls.update();
  }

  private adjustZoom(factor: number): void {
    if (!this.camera || !this.controls) {
      return;
    }

    const direction = this.camera.position.clone().sub(this.controls.target);
    const nextDistance = THREE.MathUtils.clamp(
      direction.length() * factor,
      this.controls.minDistance,
      this.controls.maxDistance
    );
    direction.setLength(nextDistance);
    this.camera.position.copy(this.controls.target).add(direction);
    this.controls.update();
  }

  private observeViewerSize(shell: HTMLElement): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry || !this.renderer || !this.camera) {
        return;
      }

      const width = Math.max(entry.contentRect.width, 1);
      const height = Math.max(entry.contentRect.height, 1);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    });
    this.resizeObserver.observe(shell);
  }

  private startRenderLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.ngZone.runOutsideAngular(() => {
      const render = (): void => {
        if (!this.renderer || !this.scene || !this.camera) {
          return;
        }

        this.animationFrameId = requestAnimationFrame(render);
        this.elapsedTime += 0.008;
        this.controls?.update();

        if (this.emberField) {
          this.emberField.rotation.y += 0.0007;
          this.emberField.position.y = Math.sin(this.elapsedTime) * this.modelSize * 0.035;
        }

        this.renderer.render(this.scene, this.camera);
      };
      render();
    });
  }

  private handleModelError(message?: string): void {
    this.clearLoadTimeout();
    this.analytics.track(AnalyticsEventName.VIEWER_FAILED, { format: this.detectedFormat() });
    this.ngZone.run(() => {
      this.isLoaded.set(true);
      this.hasError.set(true);
      this.errorMessage.set(message || `This ${this.detectedFormat()} file could not be loaded. Product photos and ordering remain available.`);
    });
  }

  private supportsWebGl(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
      return false;
    }
  }

  private isSafeModelUrl(path: string): boolean {
    try {
      const url = new URL(path, document.baseURI);
      return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  private clearLoadTimeout(): void {
    if (this.loadTimeoutId !== null) {
      window.clearTimeout(this.loadTimeoutId);
      this.loadTimeoutId = null;
    }
  }

  private handleFullscreenChange = (): void => {
    this.isFullscreen.set(document.fullscreenElement === this.viewerShellRef()?.nativeElement);
  };

  private disposeViewer(): void {
    this.loadSequence += 1;
    this.clearLoadTimeout();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.disposeSceneResources();
  }

  private disposeSceneResources(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.controls?.dispose();
    this.controls = null;

    if (this.scene) {
      this.disposeObject(this.scene);
      this.scene.clear();
    }

    this.renderer?.dispose();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.currentObject = null;
    this.emberField = null;
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh && !(child instanceof THREE.LineSegments) && !(child instanceof THREE.Points)) {
        return;
      }

      const renderable = child as THREE.Mesh;
      renderable.geometry?.dispose();
      const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
      materials.forEach(material => material?.dispose());
    });
  }
}
