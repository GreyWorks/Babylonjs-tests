
import { SceneLoader, Mesh, PBRMaterial, StandardMaterial, Material, VRExperienceHelper, Vector3, Scene, Engine, ArcRotateCamera, Light, HemisphericLight, CannonJSPlugin, MeshBuilder, StandardRenderingPipeline, Color3 } from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer'; // Augments the scene with the debug methods
import '@babylonjs/inspector'; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version
import '@babylonjs/loaders/glTF';


export class Project {

    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;
    private _camera: ArcRotateCamera;
    private _light: Light;

    constructor(canvasElement: string) {
        // Create canvas and engine
        this._canvas = <HTMLCanvasElement>document.getElementById(canvasElement);
        this._engine = new Engine(this._canvas, true);
    }

    /**
     * Creates the BABYLONJS Scene
     */
    createScene(): void {
        // create a basic BJS Scene object
        this._scene = new Scene(this._engine);
        // create a FreeCamera, and set its position to (x:0, y:5, z:-10)
        this._camera = new ArcRotateCamera("Camera", 0, Math.PI / 3, 10, Vector3.Zero(), this._scene);
        this._camera.attachControl(this._canvas);
        this._camera.wheelPrecision = 100;
        this._camera.lowerRadiusLimit = 0.1;
        // create a basic light, aiming 0,1,0 - meaning, to the sky
        this._light = new HemisphericLight("light", new Vector3(0, 1, 0), this._scene);
        this._scene.createDefaultEnvironment({createGround: true, createSkybox: true, setupImageProcessing: true});

        SceneLoader.ImportMesh(null, '/assets/mesh/', 'princess.glb', this._scene, meshes => {
            meshes[0].position.addInPlaceFromFloats(0, 0.06, 0);
            meshes[0].rotate(Vector3.Up(), Math.PI);

        });
     
        // Physics engine also works
        // let gravity = new Vector3(0, -0.9, 0);
        // this._scene.enablePhysics(gravity, new CannonJSPlugin());

        // const vrHelper: VRExperienceHelper = this._scene.createDefaultVRExperience({defaultHeight: 1.6});
        // vrHelper.enableTeleportation({floorMeshName: 'ground'});

        this._scene.debugLayer.show();

    }


    /**
     * Starts the animation loop.
     */
    animate(): void {
        this._scene.registerBeforeRender(() => {
            let deltaTime: number = (1 / this._engine.getFps());
        });

        // run the render loop
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });

        // the canvas/window resize event handler
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

  
}