const TestingTool = pc.createScript('testingTool');

TestingTool.attributes.add('foulBttn', {type: 'entity',});


// initialize code called once per entity
TestingTool.prototype.initialize = function() {
    this.foulBttn.button.on("click", (event) => {
        this.app.inningMaster.fire("foul");
    }, this);
};

// update code called every frame
TestingTool.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// TestingTool.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/