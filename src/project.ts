import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import { SceneLoader, Vector3, Mesh, PBRMaterial, StandardMaterial, Material, VRExperienceHelper } from 'babylonjs';

export class Project {

    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.ArcRotateCamera;
    private _ground: BABYLON.Mesh;
    private _light: BABYLON.Light;

    constructor(canvasElement: string) {
        // Create canvas and engine
        this._canvas = <HTMLCanvasElement>document.getElementById(canvasElement);
        this._engine = new BABYLON.Engine(this._canvas, true);
    }

    /**
     * Creates the BABYLONJS Scene
     */
    createScene(): void {
        // create a basic BJS Scene object
        this._scene = new BABYLON.Scene(this._engine);
        // create a FreeCamera, and set its position to (x:0, y:5, z:-10)
        this._camera = new BABYLON.ArcRotateCamera("Camera", 0, Math.PI / 3, 10, BABYLON.Vector3.Zero(), this._scene);
        this._camera.attachControl(this._canvas);
        this._camera.wheelPrecision = 100;
        this._camera.lowerRadiusLimit = 0.1;
        // create a basic light, aiming 0,1,0 - meaning, to the sky
        this._light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this._scene);
        this._scene.createDefaultEnvironment({createGround: false, createSkybox: true, setupImageProcessing: true});
        // this._ground = Mesh.CreateGround('ground', 10, 10, 4, this._scene);
        this._ground = Mesh.CreatePlane('ground', 10, this._scene);
        this._ground.rotate(Vector3.Right(), Math.PI /2)
        // create a shark mesh from a .obj fileimport { Mesh } from 'babylonjs/Meshes/mesh';


        SceneLoader.ImportMesh(null, '/assets/mesh/', 'princess.glb', this._scene, meshes => {
            meshes[0].position.addInPlaceFromFloats(0, 0.1, 0);
            meshes[0].rotate(Vector3.Up(), Math.PI);

            const pbrMat = this._scene.materials.find(mat => mat.name.includes('TextureAtlas'))! as PBRMaterial;
            const standardMat = new StandardMaterial('PrincessMaterial', this._scene);
            standardMat.emissiveTexture = pbrMat.albedoTexture;
            standardMat.disableLighting = true;
            standardMat.sideOrientation = Material.ClockWiseSideOrientation;
            pbrMat.dispose(true, false);
            meshes.filter(mesh => mesh instanceof BABYLON.Mesh).map(mesh => mesh.material = standardMat);
            
            
        });
     
        // Physics engine also works
        // let gravity = new BABYLON.Vector3(0, -0.9, 0);
        // this._scene.enablePhysics(gravity, new BABYLON.CannonJSPlugin());

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