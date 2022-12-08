const ChangeScene = pc.createScript('changeScene');

ChangeScene.attributes.add("sceneName", {type: "string", default: "", title: "Scene Name to Load"});

ChangeScene.prototype.initialize = function() {
    this.entity.on("load", this.loadScene, this);
};

ChangeScene.prototype.loadScene = function () {
    // Get a reference to the scene's root object
    let oldHierarchy = this.app.root.findByName('Root');
    
    // Get the path to the scene
    let scene = this.app.scenes.find(this.sceneName);
    
    // Load the scenes entity hierarchy
    this.app.scenes.loadScene(scene.url, function (err, scene) {
        if (!err) {
            oldHierarchy.destroy();
            // this.app.fire("change:scene", scene);
            
            pc.ComponentSystem.initialize(scene.root);
            pc.ComponentSystem.postInitialize(scene.root);
        } else {
            console.error(err);
        }
    });
};