import { VRExperienceHelper } from "@babylonjs/core/Cameras/VR/vrExperienceHelper";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { WebVRController } from "@babylonjs/core/Gamepads/Controllers/webVRController";
import { EventState } from "@babylonjs/core/Misc/observable";
import { Color3, Scene, Mesh, Vector3 } from "@babylonjs/core";

// Inspiration from https://playground.babylonjs.com/#ZNX043
export class VRInteractions {
    private _controllerInfos: ControllerInfo[] = [];
    private _helper: VRExperienceHelper;
    private _scene: Scene;
    constructor(vrHelper: VRExperienceHelper, scene: Scene) {
        this._helper = vrHelper;
        this._scene = scene;
        this._controllerInfos = [];
        vrHelper.displayLaserPointer = true;
        vrHelper.raySelectionPredicate = mesh => (
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

    private _onMeshSelectedWithController(data: {mesh: AbstractMesh, controller: WebVRController}, state: EventState) {
        // controller not known yet
        let cInfo: ControllerInfo = this._controllerInfos.find(ci => ci.hand === data.controller.hand);
        if(!cInfo) {
            cInfo = this._NewController(data.controller);
        }

        data.mesh.renderOverlay = true;
        data.mesh.overlayColor = new Color3(0, 1, 1);
        cInfo.selectedMesh = data.mesh;
    }

    private _NewController(controller: WebVRController) {
        const anchor = new AbstractMesh("ControllerAnchor" + controller.hand, this._scene);
        anchor.setParent(controller.mesh);
        const cInfo: ControllerInfo = {
            hand: controller.hand,
            lastPrimaryValue: 0,
            lastSecondaryValue: 0,
            lastTriggerValue: 0,
            vrAnchor: anchor,
            vrController: controller
        }
        controller.onTriggerStateChangedObservable.add((data, state) => {
            if (cInfo.lastTriggerValue <= 0.1 && data.value > 0.1) {
                if (cInfo.selectedMesh && cInfo.selectedMesh instanceof Mesh) {
                    if (cInfo.selectedMesh.physicsImpostor) {
                        cInfo.selectedMesh.physicsImpostor.sleep();
                    }
                    cInfo.selectedMesh.setParent(cInfo.vrAnchor);
                }
            }
            if (cInfo.lastTriggerValue >= 0.1 && data.value < 0.1) {
                cInfo.vrAnchor.getChildMeshes().forEach(c => {
                    cInfo.vrAnchor.removeChild(c)
                    if (c.physicsImpostor) {
                        c.physicsImpostor.wakeUp();
                    }
                });
                
            }
            cInfo.lastTriggerValue = data.value;
        });
        controller.onMainButtonStateChangedObservable.add((data, state) => {
            cInfo.lastPrimaryValue = data.value;
        });
        controller.onSecondaryButtonStateChangedObservable.add((data, state) => {
            cInfo.lastSecondaryValue = data.value;
        });
        this._controllerInfos.push(cInfo);
        return cInfo;
    }

    private _onSelectedMeshUnselected(mesh: AbstractMesh, state: EventState) {
        mesh.renderOverlay = false;
        const attachedController = this._controllerInfos.find(ci => ci.selectedMesh === mesh);
        attachedController.selectedMesh = undefined;
    }

    private _beforeRender(scene: Scene, state: EventState) {
        this._controllerInfos.forEach(ci => {
            ci.vrAnchor.getChildMeshes().forEach(m => {
                if (m.physicsImpostor) {
                    m.physicsImpostor.sleep()
                }
            });
        });
    }

}



export class MetaInteraction {
    ray: Boolean = true;
    selectable: Boolean = true;
    dragable: Boolean = false;
    hilight: Boolean = true;
    teleportTarget: Boolean = false;
}

type ControllerInfo = {
    hand: string;
    vrController: WebVRController;
    vrAnchor: AbstractMesh;
    lastTriggerValue: number;
    lastPrimaryValue: number;
    lastSecondaryValue: number;
    
    selectedMesh?: AbstractMesh;
}
