import { Scene, Effect, BaseTexture, expandToProperty, Mesh, Texture, MaterialHelper, AbstractMesh, PBRMaterialDefines, PBRMaterial, serializeAsTexture } from '@babylonjs/core';
import { PBRCustomMaterial } from '@babylonjs/materials/custom/pbrCustomMaterial';
import { Nullable } from '@babylonjs/core/types';
import fragCustomMat from './shaderparts/fragCustomMat.frag';

export class PBRMaterialExt extends PBRMaterial {
    FragmentShader: string;
    VertexShader: string;
    customName?: string;
    uniforms: string[] = [];
    samplers: string[] = [];
    static _matIndex: number = -1;

    constructor(name: string, scene: Scene) {
        super(name, scene);
        this.FragmentShader = Effect.ShadersStore['pbrPixelShader'];
        this.VertexShader = Effect.ShadersStore['pbrVertexShader'];
        const fragmentSearch = "gl_FragColor=finalColor;"
        this.FragmentShader = this.FragmentShader.replace(fragmentSearch, fragmentSearch + '\n' + fragCustomMat);
        this.customShaderNameResolve = this.NameResolve;
    }


    protected NameResolve(shaderName: string, uniforms: string[], uniformBuffers: string[], samplers: string[], defines: PBRMaterialDefines) {
        
        if(!this.customName) {
            PBRMaterialExt._matIndex++;
            this.customName = "pbrExt" + PBRMaterialExt._matIndex;
        }
        
        console.log("NameResolve", this.customName, samplers, uniforms);
        
        this.markDirty();
        
        this.prepare(defines, samplers);
        samplers.push(... this.samplers);
                
        const fragUnisReplacement = this.uniforms.map(uni => "uniform " + uni + ";\n").join();
        const fragSampReplacement = this.samplers.map(samp => "uniform sampler2D " + samp + ";\n").join();


        Effect.ShadersStore[this.customName + "VertexShader"] = this.VertexShader;
        Effect.ShadersStore[this.customName + "PixelShader"] = this.FragmentShader
            .replace('#define CUSTOM_FRAGMENT_DEFINITIONS', fragSampReplacement + fragUnisReplacement)


        const oldAfterBind = this._afterBind.bind(this);
        this._afterBind = (m, e) => {
            if (!e) {
                return;
            }
            this.AttachAfterBind(m, e);
            try {
                oldAfterBind(m, e);
            }
            catch (e) {
                console.log("PBRExt AfterBind Error", e);
            }
        }

        return this.customName;
    }

    protected AttachAfterBind(mesh: Mesh, effect: Effect) {
            // console.log("AfterBind");
            if (effect.defines.includes("DETAIL1") && this._detailTexture1 && this.detailTexture1.isReady()) {
                effect.setTexture("detail1Sampler", this._detailTexture1);
            }
            if (effect.defines.includes("DETAIL2") && this._detailTexture2 && this.detailTexture2.isReady()) {
                effect.setTexture("detail2Sampler", this._detailTexture2);
            }
    }

    
    protected prepare(defines: PBRMaterialDefines, samplers: string[]) {
        this.uniforms = [];
        this.samplers = [];
        samplers = samplers.filter( s => s !== "detail1Sampler" && s !== "detail2Sampler");
        if (this._detailTexture1 && this._detailTexture1 !== undefined) {
            defines.DETAIL1 = true;
            samplers.push("detail1Sampler");
            this.samplers.push("detail1Sampler");
        } else {
            delete defines.DETAIL1;
        }
        if (this._detailTexture2) {
            defines.DETAIL2 = true;
            samplers.push("detail2Sampler");
            this.samplers.push("detail2Sampler");
        } else {
            delete defines.DETAIL2;
        }
        defines.rebuild();
        
    }

    // detail normal
    private _detailTexture1: Nullable<BaseTexture> = null;
    
    @serializeAsTexture()
    @expandToProperty('_markAllSubMeshesAsTexturesDirty')
    public detailTexture1: BaseTexture;

    // detail normal
    private _detailTexture2: Nullable<BaseTexture> = null;
    
    @serializeAsTexture()
    @expandToProperty('_markAllSubMeshesAsTexturesDirty')
    public detailTexture2: BaseTexture;


}


