import {
    Scene,
    Effect,
    BaseTexture,
    expandToProperty,
    Mesh,
    PBRMaterialDefines,
    PBRMaterial,
    serializeAsTexture
} from '@babylonjs/core';
import { Nullable } from '@babylonjs/core/types';
// import fragment shader replacement code
import fragCustomMat from './shaderparts/fragCustomMat.frag';


export class PBRMaterialExt extends PBRMaterial {
    FragmentShader: string;
    VertexShader: string;
    customName?: string;
    uniforms: string[] = [];
    samplers: string[] = [];
    static _matIndex = -1;

    // detail normal 1
    private _detailTexture1: Nullable<BaseTexture> = null;

    // these decorators don't seem to work with get/set
    // use get/set because of eslint rules
    @serializeAsTexture()
    @expandToProperty('_markAllSubMeshesAsTexturesDirty')
    public set detailTexture1(value: Nullable<BaseTexture>) {
        if (value instanceof BaseTexture) {
            this._detailTexture1 = value;
        } else {
            (this._detailTexture1 as any) = undefined;
        }
        // need to set dirty manually because decorator seems not to work
        this._markAllSubMeshesAsTexturesDirty();
    }
    public get detailTexture1(): Nullable<BaseTexture> {
        return this._detailTexture1;
    }

    private _detailTexture1Multiplier = 1.0;
    public set detailTexture1Multiplier(value: number) {
        this._detailTexture1Multiplier = value;
    }
    public get detailTexture1Multiplier(): number {
        return this._detailTexture1Multiplier;
    }

    // detail normal 2
    private _detailTexture2: Nullable<BaseTexture> = null;

    @serializeAsTexture()
    @expandToProperty('_markAllSubMeshesAsTexturesDirty')
    public set detailTexture2(value: Nullable<BaseTexture>) {
        if (value instanceof BaseTexture) {
            this._detailTexture2 = value;
        } else {
            (this._detailTexture2 as any) = undefined;
        }
        // need to set dirty manually because decorator seems not to work
        this._markAllSubMeshesAsTexturesDirty();
    }
    public get detailTexture2(): Nullable<BaseTexture> {
        return this._detailTexture2;
    }

    private _detailTexture2Multiplier = 1.0;
    public set detailTexture2Multiplier(value: number) {
        this._detailTexture2Multiplier = value;
    }
    public get detailTexture2Multiplier(): number {
        return this._detailTexture2Multiplier;
    }

    constructor(name: string, scene: Scene) {
        super(name, scene);
        // get base shader
        this.FragmentShader = Effect.ShadersStore['pbrPixelShader'];
        this.VertexShader = Effect.ShadersStore['pbrVertexShader'];
        // replace shader part
        const fragmentSearch = "#include<bumpFragment>"
        this.FragmentShader = this.FragmentShader.replace(fragmentSearch, fragCustomMat);

        // add custom name resolve that is executed when something is changed
        this.customShaderNameResolve = this.NameResolve;

        // attach afterBind for setting the uniforms and textures in the effect
        const oldAfterBind = this._afterBind.bind(this);
        this._afterBind = (m, e) => {
            if (!e) {
                return;
            }
            this.AttachAfterBind(m, e);
            try {
                oldAfterBind(m, e);
            } catch (e) {
                console.log('PBRExt AfterBind Error', e);
            }
        };
    }

    protected NameResolve(
        shaderName: string,
        uniforms: string[],
        uniformBuffers: string[],
        samplers: string[],
        defines: PBRMaterialDefines
    ) {
        if (!this.customName) {
            // count up name index for every new material
            PBRMaterialExt._matIndex++;
            this.customName = 'pbrExt' + PBRMaterialExt._matIndex;
        }

        // prepare new data based on set variables
        this.prepare(defines, samplers);

        // add own samplers if not already in for effect caching
        this.samplers.filter(s => !samplers.includes(s)).forEach(s => samplers.push(s));

        // add custom uniforms to shader
        const possibleUniforms = [
            'mat4 detail1Matrix',
            'vec3 vDetail1Infos',
            'mat4 detail2Matrix',
            'vec3 vDetail2Infos'
        ];
        // add own uniforms if not already in for effect caching
        possibleUniforms
            .map(u => u.split(' ')[1])
            .filter(u => !uniforms.includes(u))
            .forEach(u => uniforms.push(u));
        const fragUnisReplacement = possibleUniforms.map(uni => 'uniform ' + uni + ';\n').join('');
        
        // add all custom samplers to shader
        const possibleSamplers = ['detail1Sampler', 'detail2Sampler'];
        const fragSampReplacement = possibleSamplers
            .map(samp => 'uniform sampler2D ' + samp + ';\n')
            .join('');

        // set shaders in shaderstore
        Effect.ShadersStore[this.customName + 'VertexShader'] = this.VertexShader;
        Effect.ShadersStore[this.customName + 'PixelShader'] = this.FragmentShader.replace(
            '#define CUSTOM_FRAGMENT_DEFINITIONS',
            fragUnisReplacement + fragSampReplacement
        );

        return this.customName;
    }

    // set data inside the effect after bind
    protected AttachAfterBind(mesh: Mesh, effect: Effect) {
        if (this._detailTexture1 && this._detailTexture1.isReady()) {
            effect.setMatrix('detail1Matrix', this._detailTexture1.getTextureMatrix());
            effect.setFloat3(
                'vDetail1Infos',
                this._detailTexture1.coordinatesIndex,
                this._detailTexture1.level,
                this._detailTexture1.level * this._detailTexture1Multiplier
            );
            effect.setTexture('detail1Sampler', this._detailTexture1);
        } else {
            effect.setTexture('detail1Sampler', null);
        }

        if (this._detailTexture2 && this._detailTexture2.isReady()) {
            effect.setMatrix('detail2Matrix', this._detailTexture2.getTextureMatrix());
            effect.setFloat3(
                'vDetail2Infos',
                this._detailTexture2.coordinatesIndex,
                this._detailTexture2.level,
                this._detailTexture2.level * this._detailTexture2Multiplier
            );
            effect.setTexture('detail2Sampler', this._detailTexture2);
        } else {
            effect.setTexture('detail2Sampler', null);
        }
    }

    protected prepare(defines: PBRMaterialDefines, samplers: string[]) {
        // regather information about used uniforms and textures
        this.uniforms = [];
        this.samplers = [];
        if (this._detailTexture1) {
            defines.DETAIL1 = true;
            this.samplers.push('detail1Sampler');
        } else {
            defines.DETAIL2 = false;
        }

        if (this._detailTexture2) {
            defines.DETAIL2 = true;
            this.samplers.push('detail2Sampler');
        } else {
            defines.DETAIL2 = false;
        }

        // rebuild the defines so the shader is recompiled
        defines.rebuild();
    }

    // fix hasTexture for GC
    public hasTexture(texture: BaseTexture) {
        return (
            super.hasTexture(texture) ||
            texture === this._detailTexture1 ||
            texture === this._detailTexture2
        );
    }
}

