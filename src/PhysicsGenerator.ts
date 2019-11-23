import { Scene } from "@babylonjs/core/scene";
import { Vector3, Material, StandardMaterial, MeshBuilder, PhysicsImpostor } from "@babylonjs/core";
import { MetaInteraction } from "./VRInteractions";

export class PhysicsGenerator {
    public static MakeRandomBoxes(scene: Scene, amount: number, center?: Vector3, spread?: Vector3, size?: number, materials?: Material[]) {
        center?center:new Vector3(0, 2, 5);
        spread?spread:new Vector3(1.5, 0, 1.5);
        size?size:1.0;
        if(!materials || materials.length < 1) {
            materials = [new StandardMaterial("PhysBoxMat", scene)];
        }
    
        for(let i = 0; i < amount; i++) {
            const matIdx = Math.round(Math.random() * materials.length);
            const offset = new Vector3(Math.random(), Math.random(), Math.random()).multiply(spread);
            const box = MeshBuilder.CreateBox("PhysBox" + i, {size: size});
            box.scaling.setAll(size);
            box.material = materials[matIdx];
            box.position = center.add(offset);
            box.physicsImpostor = new PhysicsImpostor(box, PhysicsImpostor.BoxImpostor, {mass: 1});
            box.metadata = (box.metadata && box.metadata !== null) ? box.metadata : {};
            box.metadata.interaction = new MetaInteraction();
        }
    }
} 