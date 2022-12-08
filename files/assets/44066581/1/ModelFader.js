const ModelFader = pc.createScript('modelFader');

ModelFader.attributes.add('config', {
    title: 'Configuration',
    type: 'json',
    schema: [{
        name: "time",
        type: 'number', 
        title: 'Time',
        min: 0,
    },{
        name: "opacity",
        type: 'curve', 
        title: 'Opacity',
        max: 1,
        min: 0,
    },]
});

ModelFader.prototype.initialize = function() {
    this.device = this.app.graphicsDevice;

    this.model = this.entity.model;
    this.loaded = false;
    this.time = 0;
    this.opacity = 0;
    
    if (this.model) {
        if (this.model.enabled) 
            this.model.enabled = false;
        if (this.model.meshInstances && this.model.meshInstances.length > 0) {
            this.showModel();
        } else {
            this.entity.once("load", this.showModel, this);
        }
    }
};

ModelFader.prototype.showModel = function() {
    this.loaded = true;
    if (this.model) {
        this.model.enabled = true;
        this.model.meshInstances.forEach((mesh, i, meshes)=> {
            let _blendType = meshes[i].material.blendType;
            if (_blendType == pc.BLEND_NONE) {
                meshes[i].material.blendType = pc.BLEND_NORMAL;
            }
            meshes[i].material.update();
        });
    }

};

ModelFader.prototype.update = function(dt) {
    if (this.model) {
        if (this.model.enabled) {
            if (this.loaded) {
                this.time += dt;
                this.opacity = this.config.opacity.value(this.time/this.config.time);
                this.model.meshInstances.forEach((mesh, i, meshes)=>{
                    meshes[i].material.opacity = this.opacity;
                    meshes[i].material.update();
                });

                if (this.time >= this.config.time)
                    this.loaded = false;
            }
        }
    }
};