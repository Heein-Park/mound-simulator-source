const Dragforce = pc.createScript('dragForce');

// See also the air resistance part in update()
// Instead of using the basic damping in Playcanvas Physics
// I rebuild another code of physics that calculate the deceleration of a ball based on air density.
Dragforce.attributes.add('airdensity', {
    type: 'number',
    title: 'Air Density',
    placeholder: 'kg/m3',
    default: 1.1839,
});

// initialize code called once per entity
Dragforce.prototype.initialize = function() {
    // Physics Variables
    this.radius = this.entity.collision.radius;
    this.currentPosition = new pc.Vec3();
    this.normalVector = new pc.Vec3();
    this.magnusVector = new pc.Vec3();
    this.lookAtVector = new pc.Vec3();
    this.lookAtMatrix = new pc.Mat4();
    this.referenceArea = Math.PI * Math.pow(this.radius, 2);
    this.draggingForce = ( _magnitude ) => {
        return ( -1/2 * this.referenceArea * _magnitude * this.airdensity );
    };
};

Dragforce.prototype.update = function(dt) {
    // When rigidboby is enabled
    if (this.entity.rigidbody.enabled) {
        // Calling rigibody per frame
        this.currentPosition.copy(this.entity.getPosition());
        const magnitude = this.entity.rigidbody.linearVelocity.length();
        
        // The formula of the magnus effect
        /* This relationship is described through
         * 
         * F = ΔPA
         * Where ΔP is the pressure difference between the top and bottom, and A is the cross-sectional area of the ball.
         * 
         * This example demonstrates how a force can be generated through a pressure gradient, and the principal that explains lift of an airfoil.
         * To determine the lift force from such a case as a spinning ball in a flowing fluid, we use the Kutta-Joukowski lift theorem
         * 
         * L = ρ * v * G
         * Where L is the lift, ρ is the density of the air, G is the vortex strength.
         * 
         * Now, the vortex strength can be determined by
         * G = 2 * π * r * Vr
         * Where r is the radius and Vr is the tangential velocity of the sphere.
         * 
         * With this equation you can estimate the lift force  [Magnus Effect In Duct Flow (J.Batko, C.Clarke, K.Smith)].
         */
        
        this.normalVector.copy(this.entity.rigidbody.linearVelocity).normalize();
        this.lookAtVector.copy(this.currentPosition).add(this.normalVector);
        this.lookAtMatrix.setLookAt(this.currentPosition, this.lookAtVector, pc.Vec3.UP);
        
        const dragForce = this.normalVector.scale( this.draggingForce( Math.pow(magnitude, 2) ) );
        this.entity.rigidbody.applyForce(dragForce);
        
        const matrixConvert = this.lookAtMatrix.transformPoint(this.entity.rigidbody.angularVelocity);
        const horizontalMagnus = this.draggingForce(-matrixConvert.y * Math.abs( magnitude ));
        const verticalMagnus = this.draggingForce(matrixConvert.x * Math.abs( magnitude ));
        this.magnusVector.set(horizontalMagnus, verticalMagnus, 0);
        this.entity.rigidbody.applyForce(this.magnusVector);
    }
};