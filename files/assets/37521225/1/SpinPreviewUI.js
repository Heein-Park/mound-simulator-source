const SpinPreview = pc.createScript('spinPreview');

SpinPreview.attributes.add('entities', {
    type: 'json',
    title: 'Entities',
    schema: [{
        name: "plane",
        title: "Plane",
        type: 'entity',
    },{
        name: "ballPreview",
        title: "Ball Preview",
        type: 'entity',
    },{
        name: "camera",
        title: "Camera",
        type: 'entity',
    },]
});

// initialize code called once per entity
SpinPreview.prototype.initialize = function() {
    this.device = this.app.graphicsDevice;
    
    // Create a 512x512x24-bit render target with a depth buffer
    const colorBuffer = new pc.Texture(this.device, {
        name: "TrackingScreen",
        width: 512,
        height: 512,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
        autoMipmap: true,
        minFilter: pc.FILTER_LINEAR,
        magFilter: pc.FILTER_LINEAR,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });

    const depthBuffer = new pc.Texture(this.device, {
        name: "TrackingScreen_Depth",
        width: 512,
        height: 512,
        format: pc.PIXELFORMAT_DEPTHSTENCIL,
        mipmaps: false,
        minFilter: pc.FILTER_NEAREST,
        magFilter: pc.FILTER_NEAREST,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });

    const layer = this.app.scene.layers.getLayerByName('TrackingCamera');
    layer.renderTarget = new pc.RenderTarget({
        colorBuffer: colorBuffer,
        depthBuffer: depthBuffer,
        depth: true,
        stencil: true,
    });
    
    this.entities.plane.element.texture = layer.renderTarget.colorBuffer;
    
    // Communication
    this.app.inningMaster.on('pitch', ({ angularVelocity }) => {
        this.entities.ballPreview.rigidbody.angularVelocity = angularVelocity;
    }, this);
    
    this.app.inningMaster.on('reset', () => {
        this.entities.ballPreview.rigidbody.angularVelocity = pc.Vec3.ZERO;
        this.entities.ballPreview.rigidbody.enabled = false;
        this.entities.ballPreview.setRotation(0, 0, 0, 1);
        this.entities.ballPreview.rigidbody.enabled = true;
    }, this);
};