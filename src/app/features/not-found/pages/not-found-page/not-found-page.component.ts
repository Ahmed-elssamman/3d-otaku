import { Component, inject, OnInit, AfterViewInit, OnDestroy, ElementRef, viewChild, NgZone, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SeoService } from '@core/services/seo.service';
import { NOT_FOUND_TEXT } from '../../not-found.control';
import { GlowButtonComponent } from '@shared/components/glow-button/glow-button.component';
import * as THREE from 'three';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, FormsModule, GlowButtonComponent],
  templateUrl: './not-found-page.component.html',
  styleUrl: './not-found-page.component.scss'
})
export class NotFoundPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('bgCanvas');
  readonly text = NOT_FOUND_TEXT;
  searchQuery = '';

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private mainMesh?: THREE.Mesh;
  private wireframeMesh?: THREE.Mesh;
  private particleSystem?: THREE.Points;
  private animationFrameId?: number;

  private mouseX = 0;
  private mouseY = 0;
  private targetMouseX = 0;
  private targetMouseY = 0;

  ngOnInit(): void {
    this.seoService.setTitle('404 - Lost in Dimension | 3D Otaku');
    this.seoService.setMetaDescription('The 3D model or prop page you are looking for has faded into another dimension.');
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.init3dScene(), 50);
  }

  ngOnDestroy(): void {
    this.clean3dScene();
  }

  onMouseMove(event: MouseEvent): void {
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;
    this.targetMouseX = (event.clientX - windowHalfX) * 0.001;
    this.targetMouseY = (event.clientY - windowHalfY) * 0.001;
  }

  onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigate(['/products'], { queryParams: { search: q } });
    }
  }

  private init3dScene(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    this.clean3dScene();

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || 600;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 8;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create 3D Polyhedron Gem
    const geometry = new THREE.IcosahedronGeometry(2.2, 1);

    const material = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: false,
      transparent: true,
      opacity: 0.65
    });

    this.mainMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mainMesh);

    // Glowing Wireframe Layer
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial);
    this.wireframeMesh.scale.setScalar(1.02);
    this.scene.add(this.wireframeMesh);

    // Particle Cloud (Floating Otaku Energy Nodes)
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 16;
      positions[i + 1] = (Math.random() - 0.5) * 16;
      positions[i + 2] = (Math.random() - 0.5) * 16;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.75
    });

    this.particleSystem = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.particleSystem);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xec4899, 4, 20);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x38bdf8, 4, 20);
    pointLight2.position.set(-5, -5, 5);
    this.scene.add(pointLight2);

    this.ngZone.runOutsideAngular(() => {
      let clock = new THREE.Clock();

      const animate = () => {
        if (!this.renderer || !this.scene || !this.camera) return;
        this.animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // Mouse smooth interpolation
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

        if (this.mainMesh && this.wireframeMesh) {
          this.mainMesh.rotation.x = elapsedTime * 0.3 + this.mouseY * 2;
          this.mainMesh.rotation.y = elapsedTime * 0.4 + this.mouseX * 2;

          this.wireframeMesh.rotation.x = elapsedTime * 0.3 + this.mouseY * 2;
          this.wireframeMesh.rotation.y = elapsedTime * 0.4 + this.mouseX * 2;
        }

        if (this.particleSystem) {
          this.particleSystem.rotation.y = elapsedTime * 0.05;
        }

        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }

  private clean3dScene(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }
    this.scene = undefined;
    this.camera = undefined;
  }
}
