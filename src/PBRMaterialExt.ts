import { Scene, Effect, BaseTexture, expandToProperty, Mesh, PBRMaterialDefines, PBRMaterial, serializeAsTexture } from '@babylonjs/core';
import { Nullable } from '@babylonjs/core/types';
import fragCustomMat from './shaderparts/fragCustomMat.frag';

export class PBRMaterialExt extends PBRMaterial {
    FragmentShader: string;
    VertexShader: string;
    customName?: string;
    uniforms: string[] = [];
    samplers: string[] = [];
    static _matIndex: number = -1;

     // detail normal 1
     private _detailTexture1: Nullable<BaseTexture> = null;
    
     @serializeAsTexture()
     @expandToProperty('_markAllSubMeshesAsTexturesDirty')
     public detailTexture1: BaseTexture;
 
     // detail normal 2
     private _detailTexture2: Nullable<BaseTexture> = null;
     
     @serializeAsTexture()
     @expandToProperty('_markAllSubMeshesAsTexturesDirty')
     public detailTexture2: BaseTexture;

    constructor(name: string, scene: Scene) {
        super(name, scene);
        // get base shader
        this.FragmentShader = Effect.ShadersStore['pbrPixelShader'];
        this.VertexShader = Effect.ShadersStore['pbrVertexShader'];
        // replace shader part
        const fragmentSearch = "gl_FragColor=finalColor;"
        this.FragmentShader = this.FragmentShader.replace(fragmentSearch, fragmentSearch + '\n' + fragCustomMat);

        // add custom name resolve that is executed when something is changed
        this.customShaderNameResolve = this.NameResolve;
    }


    protected NameResolve(shaderName: string, uniforms: string[], uniformBuffers: string[], samplers: string[], defines: PBRMaterialDefines) {
        
        if(!this.customName) {
            // count up name index for every new material
            PBRMaterialExt._matIndex++;
            this.customName = "pbrExt" + PBRMaterialExt._matIndex;
        }
                
        // prepare new data based on set variables
        this.prepare(defines, samplers);
        // add own samplers if not already in for effect caching
        this.samplers.filter(s => !samplers.includes(s)).forEach(s => samplers.push(s));

        // add custom uniforms to shader
        const fragUnisReplacement = this.uniforms.map(uni => "uniform " + uni + ";\n").join();
        // add custom samplers to shader
        const fragSampReplacement = this.samplers.map(samp => "uniform sampler2D " + samp + ";\n").join();


        // set shaders in shaderstore
        Effect.ShadersStore[this.customName + "VertexShader"] = this.VertexShader;
        Effect.ShadersStore[this.customName + "PixelShader"] = this.FragmentShader
            .replace('#define CUSTOM_FRAGMENT_DEFINITIONS', fragSampReplacement + fragUnisReplacement)


        // attach afterBind for setting the uniforms and textures in the effect
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

    // set data inside the effect after bind
    protected AttachAfterBind(mesh: Mesh, effect: Effect) {
            if (effect.defines.includes("DETAIL1") && this._detailTexture1 && this.detailTexture1.isReady()) {
                effect.setTexture("detail1Sampler", this._detailTexture1);
            }
            if (effect.defines.includes("DETAIL2") && this._detailTexture2 && this.detailTexture2.isReady()) {
                effect.setTexture("detail2Sampler", this._detailTexture2);
            }
    }

    
    protected prepare(defines: PBRMaterialDefines, samplers: string[]) {
        // regather information about used uniforms and textures
        this.uniforms = [];
        this.samplers = [];
        if (this._detailTexture1 && this._detailTexture1 !== undefined) {
            defines.DETAIL1 = true;
            this.samplers.push("detail1Sampler");
        } else {
            delete defines.DETAIL1;
        }

        if (this._detailTexture2) {
            defines.DETAIL2 = true;
            this.samplers.push("detail2Sampler");
        } else {
            delete defines.DETAIL2;
        }

        // rebuild the defines so the shader is recompiled
        defines.rebuild();
        
    }


}


