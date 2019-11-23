import { VRExperienceHelper } from "@babylonjs/core/Cameras/VR/vrExperienceHelper";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { WebVRController } from "@babylonjs/core/Gamepads/Controllers/webVRController";
import { EventState } from "@babylonjs/core/Misc/observable";
import { Color3, Scene, Mesh, Vector3, PhysicsImpostor, PhysicsJoint, PhysicsJointData, Quaternion, MeshBuilder } from "@babylonjs/core";

// Inspiration from https://playground.babylonjs.com/#ZNX043
export class VRInteractions {
    private _controllerInfos: ControllerInfo[] = [];
    private _helper: VRExperienceHelper;
    private _scene: Scene;

    public sensitivities = {
        trigger: 0.15,
        primary: 0.15,
        secondary: 0.15
    }
    public highlightColor = new Color3(0, 1, 1);
    public laserColor = new Color3(1, 0.1, 0.1);


    constructor(vrHelper: VRExperienceHelper, scene: Scene) {
        this._helper = vrHelper;
        this._scene = scene;
        this._controllerInfos = [];
        vrHelper.displayLaserPointer = true;
        // make it red
        vrHelper.updateControllerLaserColor = true;
        vrHelper.changeLaserColor(this.laserColor);
        vrHelper.meshSelectionPredicate = mesh => (
            (mesh.metadata &&
                mesh.metadata.interaction &&
                mesh.metadata.interaction.selectable == true)
        );
        vrHelper.raySelectionPredicate = mesh => (
            mesh.metadata && mesh.metadata.interaction && mesh.metadata.interaction.ray == true
        );

        // Picked => Selected => SelectedWithController => SelectedMeshUnselected
        /*
        vrHelper.onNewMeshPicked.add((data, state) => {console.log('Picked', data, state);});
        vrHelper.onNewMeshSelected.add((data, state) => {console.log('Selected', data, state);});
        vrHelper.onMeshSelectedWithController.add((data, state) => {console.log('SelectedWithController', data, state);});
        vrHelper.onSelectedMeshUnselected.add((data, state) => {console.log('SelectedMeshUnselected', data, state);});
        */

        vrHelper.onMeshSelectedWithController.add(this._onMeshSelectedWithController.bind(this));
        vrHelper.onSelectedMeshUnselected.add(this._onSelectedMeshUnselected.bind(this));

        scene.onBeforeRenderObservable.add(this._beforeRender.bind(this));
    }

    /**
     * Mesh was selected by laser or controller
     * @param data selected mesh and used controller
     * @param state 
     */
    private _onMeshSelectedWithController(data: { mesh: AbstractMesh, controller: WebVRController }, state: EventState) {
        // controller not known yet
        let cInfo: ControllerInfo = this._controllerInfos.find(ci => ci.hand === data.controller.hand);
        if (!cInfo) {
            cInfo = this._NewController(data.controller);
        }

        // remove old hightlight if unselected did not trigger
        if (cInfo.selectedMesh) {
            cInfo.selectedMesh.renderOverlay = false;
        }

        // highlight new
        if (
            data.mesh.metadata &&
            data.mesh.metadata.interaction &&
            data.mesh.metadata.interaction.highlight &&
            cInfo.attachedMesh !== data.mesh // only if not already picked up
        ) {
            data.mesh.renderOverlay = true;
            data.mesh.overlayColor = this.highlightColor;
        }

        cInfo.selectedMesh = data.mesh;
    }

    /**
     * On selection loss
     * @param mesh mesh that lost the selection
     * @param state 
     */
    private _onSelectedMeshUnselected(mesh: AbstractMesh, state: EventState) {
        mesh.renderOverlay = false;
        const attachedController = this._controllerInfos.find(ci => ci.selectedMesh === mesh);
        if (attachedController) {
            attachedController.selectedMesh = undefined;
        }
    }

    /**
     * Add new ControllerInfo for controller
     * @param controller 
     */
    private _NewController(controller: WebVRController) {
        
        if (!controller.mesh.rotationQuaternion) {
            controller.mesh.rotationQuaternion = new Quaternion();
        }

        const anchor = MeshBuilder.CreateIcoSphere("VRAnchor_" + controller.hand, { radius: 0.01 }, this._scene);
        anchor.setAbsolutePosition(controller.mesh.absolutePosition);
        anchor.rotationQuaternion = new Quaternion();
        anchor.rotationQuaternion.copyFrom(controller.mesh.rotationQuaternion);

        if (!controller.mesh.physicsImpostor) {
            controller.mesh.physicsImpostor = new PhysicsImpostor(anchor, PhysicsImpostor.NoImpostor, {mass: 0});
        }

        // const tracker = new AbstractMesh("VRTracker" + controller.hand, this._scene);
        const tracker = MeshBuilder.CreateIcoSphere("VRTracker_" + controller.hand, { radius: 0.05 }, this._scene);
        tracker.visibility = 0.5;
        tracker.physicsImpostor = new PhysicsImpostor(tracker, PhysicsImpostor.NoImpostor, { mass: 0 });
        tracker.rotationQuaternion = new Quaternion();

        const cInfo: ControllerInfo = {
            hand: controller.hand,
            lastPrimaryValue: 0,
            lastSecondaryValue: 0,
            lastTriggerValue: 0,
            vrAnchor: anchor,
            vrController: controller,
            trackerObject: tracker
        }

        // TRIGGER ACTION
        controller.onTriggerStateChangedObservable.add((data, state) => {
            // pressed
            if (
                cInfo.lastTriggerValue <= this.sensitivities.trigger &&
                data.value > this.sensitivities.trigger && cInfo.selectedMesh
            ) {
                cInfo.attachedMesh = cInfo.selectedMesh;
                // attach to anchor
                cInfo.attachedMesh.setParent(cInfo.vrAnchor);
                // disable physics to prevent it from falling
                cInfo.attachedMesh.physicsImpostor.sleep();
                // update tracker object
                cInfo.trackerObject.setAbsolutePosition(cInfo.attachedMesh.absolutePosition);
                cInfo.trackerObject.rotationQuaternion.copyFrom(cInfo.attachedMesh.rotationQuaternion);
                // remove overlay when picked up
                cInfo.attachedMesh.renderOverlay = false;
            }

            // release is handled in the (physics) frame loop

            cInfo.lastTriggerValue = data.value;
        });

        // MAIN BUTTON ACTION
        controller.onMainButtonStateChangedObservable.add((data, state) => {
            cInfo.lastPrimaryValue = data.value;
        });

        // SECONDARY BUTTON ACTION
        controller.onSecondaryButtonStateChangedObservable.add((data, state) => {
            cInfo.lastSecondaryValue = data.value;
        });
        this._controllerInfos.push(cInfo);
        return cInfo;
    }

    /**
     * Execute before each frame
     * @param scene
     * @param state
     */
    private _beforeRender(scene: Scene, state: EventState) {
        this._controllerInfos.forEach(ci => {
            const frameTimeMs =  this._scene.getEngine().getDeltaTime();

            // if attached mesh was let go
            if(ci.attachedMesh && ci.lastTriggerValue < this.sensitivities.trigger) {
                const deltaPosition = ci.attachedMesh.absolutePosition.subtract(ci.trackerObject.absolutePosition);
                const angularVelocity = ci.vrController.mesh.physicsImpostor.getAngularVelocity();
                const linearVelocity = deltaPosition.scale(400. / frameTimeMs);

                ci.attachedMesh.physicsImpostor.setLinearVelocity(linearVelocity);
                ci.attachedMesh.physicsImpostor.setAngularVelocity(angularVelocity);

                ci.trackerObject.setAbsolutePosition(ci.vrAnchor.absolutePosition);

                ci.vrAnchor.removeChild(ci.attachedMesh);
                // enable physics again
                ci.attachedMesh.physicsImpostor.wakeUp();
                ci.attachedMesh = undefined;
            }

            // update anchor from controller data
            ci.vrAnchor.setAbsolutePosition(ci.vrController.mesh.absolutePosition);
            ci.vrAnchor.rotationQuaternion.copyFrom(ci.vrController.mesh.rotationQuaternion);

            
            if (ci.attachedMesh && ci.trackerObject) {
                // update tracker object
                ci.trackerObject.setAbsolutePosition(ci.attachedMesh.absolutePosition);
                ci.trackerObject.rotationQuaternion.copyFrom(
                    Quaternion.Inverse(ci.vrController.mesh.rotationQuaternion)
                    .multiply(ci.attachedMesh.rotationQuaternion)
                );

            }
        });
    }

}


// Metadata for Mesh.metadata.interaction
export class MetaInteraction {
    ray: Boolean = true;
    selectable: Boolean = true;
    dragable: Boolean = false;
    highlight: Boolean = true;
    teleportTarget: Boolean = false;
    clickAction: () => void;
}

type ControllerInfo = {
    // left or right
    hand: string;
    // vrHelper controller object
    vrController: WebVRController;
    // anchor attached to controller
    vrAnchor: AbstractMesh;
    // tracker object following attached mesh for physics
    trackerObject: AbstractMesh;
    // last values
    lastTriggerValue: number;
    lastPrimaryValue: number;
    lastSecondaryValue: number;

    // select when ray hit object
    selectedMesh?: AbstractMesh;
    // attach when pick up with trigger
    attachedMesh?: AbstractMesh;
}
