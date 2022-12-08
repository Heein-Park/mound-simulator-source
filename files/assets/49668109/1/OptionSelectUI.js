const OptionSelectUI = pc.createScript('optionSelectUI');

OptionSelectUI.attributes.add('preview', {
    title: 'Preview',
    type: 'entity',
});

OptionSelectUI.attributes.add('detail', {
    title: 'Detail',
    type: 'entity',
});

OptionSelectUI.attributes.add('data', {
    title: 'Data',
    type: 'json',
    array: true,
    schema: [{
        name: "image",
        type: 'asset',
    }, {
        name: "text",
        type: 'string',
    }]
});

OptionSelectUI.attributes.add('arrows', {
    type: 'json',
    title: 'Arrow Buttons',
    schema: [{
        name: "left",
        type: 'entity',
    }, {
        name: "right",
        type: 'entity',
    }]
});

OptionSelectUI.prototype.initialize = function() {
    this.lastIndex = this.data.length - 1;
    this.entity.once("set:default", this.callDefault, this);
    
    this.arrows.left.button.on("click", () => {
        this.indexNum--;
        if (this.indexNum < 0) this.indexNum = this.lastIndex;
        this.setPreview(this.indexNum);
    }, this);
    
    this.arrows.right.button.on("click", () => {
        this.indexNum++;
        if (this.indexNum > this.lastIndex) this.indexNum = 0;
        this.setPreview(this.indexNum);
    }, this);
};

OptionSelectUI.prototype.callDefault = function(value) {
    this.indexNum = value;
    this.setPreview(this.indexNum);
};

OptionSelectUI.prototype.postInitialize = function() {
    this.entity.fire("requestDefault");
};
    
OptionSelectUI.prototype.setPreview = function (_int) {
    if (_int < 0) _int = 0;
    else if (_int > this.lastIndex) _int = this.lastIndex; 
    if (this.preview) this.preview.element.texture = this.data[_int].image.resource;
    if (this.detail) this.detail.element.text = this.data[_int].text;
    this.entity.fire("set:value", _int);
};