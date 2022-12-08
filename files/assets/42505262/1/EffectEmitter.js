const EffectEmitter = pc.createScript('effectEmitter');

EffectEmitter.attributes.add('emitters', {
    type: 'entity',
    title: 'Emitters',
    array: true,
});

// initialize code called once per entity
EffectEmitter.prototype.initialize = function() {
    if (this.app.debug) console.log(this.emitters);
    this.entity.on('emit', this.emit, this);
};

EffectEmitter.prototype.emit = function( _position ) {
    this.emitters.forEach( (emitter, i, array) => {
        emitter.setPosition( _position );
        if (emitter.particlesystem) {
            const particlesystem = emitter.particlesystem;
            if ( !particlesystem.isPlaying() ) particlesystem.play();
            particlesystem.reset();
        }
        
        if(emitter.sprite) {
            let clips = Object.values(emitter.sprite.clips);
            if (this.app.debug) console.log(clips);
            emitter.sprite.play(clips[0].name);
        }
    });
};