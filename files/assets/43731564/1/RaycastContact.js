const RaycastContact = pc.createScript('raycastContact');

// initialize code called once per entity
RaycastContact.prototype.initialize = function() {
    // Physics Variables
    this.initialPosition = this.entity.getPosition().clone(); // Get the position ofthe beginning stage. This will be reㅠㅜused in onCatch() function
    this.currentPosition = this.initialPosition.clone();
    this.previousPosition = this.initialPosition.clone();
};

RaycastContact.prototype.update = function(dt) {
    if (this.entity.rigidbody.enabled) {
        // Record previous position and current position
        this.previousPosition.copy(this.currentPosition);
        this.currentPosition.copy(this.entity.getPosition());

        // Raycasting Entities
        const raycastedResults = this.app.systems.rigidbody.raycastAll(this.previousPosition, this.currentPosition);
        
        if (raycastedResults.length > 0) {
            raycastedResults.map( result => {
                let data = {
                    entity : result.entity,
                    normal : result.normal,
                    point : result.point,
                };
                data.entity.fire(`contact:${this.entity.name}`, this.entity, data);
            });
        }
    }
};