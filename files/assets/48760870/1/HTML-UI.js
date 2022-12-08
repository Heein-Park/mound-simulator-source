// Reference : https://developer.playcanvas.com/en/tutorials/htmlcss-ui/
// Playcanvas : https://playcanvas.com/project/443090/overview/htmlcss-ui

const HtmlUi = pc.createScript('htmlUi');

HtmlUi.attributes.add('uniqueID', {type: 'string', title: 'Unique ID'});
HtmlUi.attributes.add('css', {type: 'asset', assetType:'css', title: 'CSS Asset'});
HtmlUi.attributes.add('html', {type: 'asset', assetType:'html', title: 'HTML Asset'});

HtmlUi.prototype.initialize = function () {    
    // Differentiate each html ui element to prevent the overlapping styles
    // It will automatically append a special class from guid of an entity to all elements in html and css files
    const replacer = (match) => `#${this.uniqueID} ${match}`;
    
    this.style = document.createElement('style');
    this.style.innerHTML = this.css.resource.replace(/(^\w|\.|\#).+?(?=\{[^{}]*\})/gm, replacer) || '';
    document.head.appendChild(this.style);
    
    // Add the HTML
    this.div = document.createElement('div');
    this.div.id = this.uniqueID;
    this.div.innerHTML = this.html.resource || '';
    this.div.onmouseover = () => this.app.fire("over:HTML");
    this.div.onmouseout = () => this.app.fire("out:HTML");
    document.body.appendChild(this.div);
    
    this.entity.on("destroy", () => this.div.remove(), this);
    this.entity.on("hide", this.hide, this);
    this.entity.on("show", this.show, this);
    this.on('disable', this.hide, this);
    this.on('enable', this.show, this);
};

HtmlUi.prototype.hide = function () { this.div.style.visibility = 'hidden'; };
HtmlUi.prototype.show = function () { this.div.style.visibility = 'visible'; };

