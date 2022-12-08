var PlaySpriteSheets = pc.createScript('playSpriteSheets');

PlaySpriteSheets.attributes.add('config', {
    type: 'json',
    schema: [{
        name: "duration",
        title: "Duration",
        type: "number",
        min: 0,
        default: 3,
    }]
});


// initialize code called once per entity
PlaySpriteSheets.prototype.initialize = function() {
    this.element = this.entity.element;
    
    this.time = 0;
    if (this.element.spriteAsset) {
        this.spriteAsset = this.app.assets.get(this.element.spriteAsset);
        this.frameNum = this.spriteAsset.resource.frameKeys.length;
    }
};

// update code called every frame
PlaySpriteSheets.prototype.update = function(dt) {
    if (this.time < this.config.duration) {
        this.time += dt;
        let _time = this.time;
        _time /= this.config.duration;
        
        let frameIndex = Math.floor(pc.math.lerp(0, this.frameNum-1, _time));
        this.element.spriteFrame = frameIndex;
        
    } else {
        this.time -= this.config.duration;
    }
};