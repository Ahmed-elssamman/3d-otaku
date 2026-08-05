import {
  Component,
  input,
  signal,
  ElementRef,
  viewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  AfterViewInit,
  OnDestroy,
  effect,
  NgZone,
  inject
} from '@angular/core';
import { Product } from '@core/models/product.model';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-product-3d-viewer',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './product-3d-viewer.component.html',
  styleUrl: './product-3d-viewer.component.scss'
})
export class Product3dViewerComponent implements AfterViewInit, OnDestroy {
  readonly product = input.required<Product>();
  private ngZone = inject(NgZone);

  readonly modelViewerRef = viewChild<ElementRef<HTMLElement>>('viewer');
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('threeCanvas');

  readonly isAutoRotating = signal<boolean>(true);
  readonly isLoaded = signal<boolean>(false);
  readonly hasError = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly detectedFormat = signal<string>('GLB');
  readonly isThreeEngine = signal<boolean>(false);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private animationFrameId?: number;
  private currentMesh?: THREE.Object3D;

  constructor() {
    effect(() => {
      const p = this.product();
      this.detectFormatAndEngine(p);
    });
  }

  ngAfterViewInit(): void {
    if (this.isThreeEngine()) {
      setTimeout(() => this.initThreeEngine(), 50);
    }
  }

  ngOnDestroy(): void {
    this.cleanThreeEngine();
  }

  private detectFormatAndEngine(product: Product): void {
    const url = (product.modelUrl || '').toLowerCase();
    const type = (product.modelType || '').toString().toUpperCase();

    if (url.endsWith('.stl') || type === 'STL') {
      this.detectedFormat.set('STL');
      this.isThreeEngine.set(true);
    } else if (url.endsWith('.obj') || type === 'OBJ') {
      this.detectedFormat.set('OBJ');
      this.isThreeEngine.set(true);
    } else if (url.endsWith('.ply') || type === 'PLY') {
      this.detectedFormat.set('PLY');
      this.isThreeEngine.set(true);
    } else if (url.endsWith('.gltf') || type === 'GLTF') {
      this.detectedFormat.set('GLTF');
      this.isThreeEngine.set(false);
    } else {
      this.detectedFormat.set('GLB');
      this.isThreeEngine.set(false);
    }
  }

  toggleAutoRotate(): void {
    const nextState = !this.isAutoRotating();
    this.isAutoRotating.set(nextState);

    if (this.isThreeEngine() && this.controls) {
      this.controls.autoRotate = nextState;
    } else {
      const el = this.modelViewerRef()?.nativeElement as any;
      if (el) {
        el.autoRotate = nextState;
      }
    }
  }

  resetCamera(): void {
    if (this.isThreeEngine() && this.controls && this.camera && this.currentMesh) {
      this.centerAndFitCamera(this.currentMesh);
    } else {
      const el = this.modelViewerRef()?.nativeElement as any;
      if (el && typeof el.resetTurntableRotation === 'function') {
        el.resetTurntableRotation();
      }
    }
  }

  onModelLoad(): void {
    this.isLoaded.set(true);
    this.hasError.set(false);
  }

  onModelError(): void {
    this.isLoaded.set(true);
    this.hasError.set(true);
    this.errorMessage.set('Failed to load 3D model geometry.');
  }

  private initThreeEngine(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.cleanThreeEngine();
    this.isLoaded.set(false);
    this.hasError.set(false);

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || 600;
    const height = parent?.clientHeight || 540;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050505');

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 100);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = this.isAutoRotating();
    this.controls.autoRotateSpeed = 3.0;

    // Studio Lights setup for crisp anime aesthetic
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(1, 2, 3);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xec4899, 0.8);
    dirLight2.position.set(-2, -1, -1);
    this.scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0x3b82f6, 0.8);
    dirLight3.position.set(2, -1, -2);
    this.scene.add(dirLight3);

    this.loadThreeModel();

    this.ngZone.runOutsideAngular(() => {
      const animate = () => {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.animationFrameId = requestAnimationFrame(animate);

        if (this.controls) {
          this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private loadThreeModel(): void {
    const url = this.product().modelUrl;
    const format = this.detectedFormat();

    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.3,
      roughness: 0.35
    });

    if (format === 'STL') {
      const loader = new STLLoader();
      loader.load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, material);
          this.setupLoadedObject(mesh);
        },
        undefined,
        () => this.onModelError()
      );
    } else if (format === 'OBJ') {
      const loader = new OBJLoader();
      loader.load(
        url,
        (obj) => {
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).material = material;
            }
          });
          this.setupLoadedObject(obj);
        },
        undefined,
        () => this.onModelError()
      );
    } else if (format === 'PLY') {
      const loader = new PLYLoader();
      loader.load(
        url,
        (geometry) => {
          geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, material);
          this.setupLoadedObject(mesh);
        },
        undefined,
        () => this.onModelError()
      );
    }
  }

  private setupLoadedObject(object: THREE.Object3D): void {
    if (!this.scene) return;
    this.currentMesh = object;
    this.scene.add(object);
    this.centerAndFitCamera(object);
    this.ngZone.run(() => {
      this.isLoaded.set(true);
    });
  }

  private centerAndFitCamera(object: THREE.Object3D): void {
    if (!this.camera || !this.controls) return;

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    object.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.6;

    if (isNaN(cameraZ) || cameraZ === 0) cameraZ = 50;

    this.camera.position.set(0, size.y * 0.2, cameraZ);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private cleanThreeEngine(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
    this.scene = undefined;
    this.camera = undefined;
    this.currentMesh = undefined;
  }
}
