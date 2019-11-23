
import { SceneLoader, Mesh, PBRMaterial, StandardMaterial, Material, VRExperienceHelper, Vector3, Scene, Engine, ArcRotateCamera, Light, HemisphericLight, CannonJSPlugin, MeshBuilder, StandardRenderingPipeline, Color3, PhysicsImpostor } from '@babylonjs/core';
import '@babylonjs/core/Debug/debugLayer'; // Augments the scene with the debug methods
import '@babylonjs/inspector'; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version
import '@babylonjs/loaders/glTF';
import { PhysicsGenerator } from './PhysicsGenerator';
import { VRInteractions, MetaInteraction } from './VRInteractions';

export class Project {

    private _canvas: HTMLCanvasElement;
    private _engine: Engine;
    private _scene: Scene;
    private _ground: Mesh;
    private _camera: ArcRotateCamera;
    private _light: Light;

    constructor(canvasElement: string) {
        // Create canvas and engine
        this._canvas = <HTMLCanvasElement>document.getElementById(canvasElement);
        this._engine = new Engine(this._canvas, false);
    }

    /**
     * Creates the BABYLONJS Scene
     */
    createScene(): void {
        // create a basic BJS Scene object
        this._scene = new Scene(this._engine);
        // create a FreeCamera, and set its position to (x:0, y:5, z:-10)

        // Physics engine also works
        let gravity = new Vector3(0, -0.98, 0);
        this._scene.enablePhysics(gravity, new CannonJSPlugin());
        
        // TODO: Find correct calculation for the timestep
        console.log(this._scene.getPhysicsEngine().getTimeStep(), this._engine.getDeltaTime());
        this._scene._physicsEngine.setTimeStep(0.035);
        
        // this._camera = new ArcRotateCamera("Camera", 0, Math.PI / 3, 10, Vector3.Zero(), this._scene);
        // this._camera.attachControl(this._canvas);
        // this._camera.wheelPrecision = 100;
        // this._camera.lowerRadiusLimit = 0.1;
        
        // create a basic light, aiming 0,1,0 - meaning, to the sky
        this._light = new HemisphericLight("light", new Vector3(0, 1, 0), this._scene);
        this._scene.createDefaultEnvironment({createGround: false, createSkybox: true, setupImageProcessing: true, groundSize: 100});
        this._ground = MeshBuilder.CreateGround("Ground", {width: 100, height: 100, subdivisions:20});
        this._ground.metadata = this._ground.metadata ? this._ground.metadata : {};
        const groundInteraction = new MetaInteraction();
        groundInteraction.selectable = false;
        this._ground.metadata.interaction = groundInteraction;
        

/*         SceneLoader.ImportMesh(null, '/assets/mesh/', 'princess.glb', this._scene, meshes => {
            meshes[0].position.addInPlaceFromFloats(0, 0.00, 8);
            meshes[0].position.addInPlaceFromFloats(0, -0.014, 0);
            meshes[0].scalingDeterminant = 1.6;

            meshes[0].rotate(Vector3.Up(), - 0.5 * Math.PI);

            const pbrMat = this._scene.materials.find(mat => mat.name.includes('TextureAtlas'))! as PBRMaterial;
            const standardMat = new StandardMaterial('PrincessMaterial', this._scene);
            standardMat.emissiveTexture = pbrMat.albedoTexture.clone();
            standardMat.disableLighting = true;
            standardMat.sideOrientation = Material.ClockWiseSideOrientation;
            pbrMat.dispose(true, false);
            meshes.filter(mesh => mesh instanceof Mesh).map(mesh => mesh.material = standardMat);

        }); */


        this._scene.debugLayer.show();

        const vrHelper: VRExperienceHelper = this._scene.createDefaultVRExperience({defaultHeight: 1.6, useMultiview: true, laserToggle: true});
        
        vrHelper.enableInteractions();
        vrHelper.enableTeleportation({floorMeshes: [this._ground]});
        const vrInteractions = new VRInteractions(vrHelper, this._scene);

        this._ground.physicsImpostor = new PhysicsImpostor(this._ground, PhysicsImpostor.BoxImpostor, {mass: 0, restitution: 0.9});


        PhysicsGenerator.MakeRandomBoxes(this._scene, 5, new Vector3(0, 2, 2), new Vector3(1, 0.5, 1), 0.5);


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