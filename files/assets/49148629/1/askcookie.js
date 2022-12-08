const Askcookie = pc.createScript('askcookie');

Askcookie.attributes.add('json', {
    type: 'asset',
    assetType: 'json'
});
 
// initialize code called once per entity
Askcookie.prototype.initialize = function() {
    this.jsonArrange = this.entity.script.jsonArrange;
    this.storagePermission = localStorage.getItem("storagePermission");
    this.webstorage = this.jsonArrange.filter(this.json.resource, "type", "Web Storage");
    this.permissionFlag = 0;
    this.maximumFlag = function () {
        let max = Object.keys(this.jsonArrange.arrange(this.json.resource, "purpose")).length;
        let bit = 0;
        for (let i = 0; i < max; i++) bit |= 1 << i;
        return bit;
    }.call(this);
};

Askcookie.prototype.postInitialize = function() {
    this.optionList = document.getElementById("option");
    this.inputBoxes = this.optionList.querySelectorAll("label.switch input");
    
    const setStoragePermission = (integer) => {
        this.entity.fire("hide");
        if (integer <= 1) { 
            localStorage.clear();
            this.inputBoxes.forEach((inputBox) => {
                if (!inputBox.disabled) inputBox.removeAttribute("checked");
            });
        } else this.inputBoxes.forEach((inputBox) => {
            if (!inputBox.disabled) inputBox.setAttribute("checked", "");
        });
        localStorage.setItem("storagePermission", integer);
    };

    // Buttons in the first banner
    this.accept = document.getElementById('accept');
    if (this.accept) this.accept.addEventListener('click', () => setStoragePermission(this.maximumFlag));
    
    this.decline = document.getElementById('decline');
    if (this.decline) this.decline.addEventListener('click', () => setStoragePermission(1));
    
    this.close = document.getElementById('close');
    if (this.close) this.close.addEventListener('click', () =>  this.entity.fire("hide"));

    // Anchor that leads a customer to a detail section
    this.changePreference = document.getElementById('changePreference');
    this.detail = document.getElementById('detail');
    if (this.changePreference && this.detail)
    this.changePreference.addEventListener('click', () => {
        if (this.detail.classList.contains("expand")) this.detail.classList.replace("expand", "fold");
        else if (this.detail.classList.contains("fold")) this.detail.classList.replace("fold", "expand");
        else this.detail.classList.add("expand");
    });
    
    if (!this.storagePermission) this.entity.fire("show");
    else this.entity.fire("hide");
    
    this.inputBoxes.forEach((inputBox, i, array) => {
        let bit = 1 << i;
        if (inputBox.checked) this.permissionFlag |= bit;
        if (this.storagePermission & bit) inputBox.setAttribute("checked", "");
        
        if(!inputBox.disabled)
        inputBox.addEventListener('input', (e) => {
            if (e.target.checked) this.permissionFlag |= bit;
            else this.permissionFlag ^= bit;
            localStorage.setItem("storagePermission", this.permissionFlag);
        });
    });
    
    this.webstorageList = document.getElementById('webstorage-list');
    if (this.webstorageList) {
        for (const [type, nest] of Object.entries(this.webstorage)) {
            this.webstorageList.insertAdjacentHTML('beforeend', `
                <div class="item">
                    <div class="column">
                        <div class="keys row">Name</div>
                        <div class="values row">${type}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Duration</div>
                        <div class="values row">${nest.duration}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Purpose</div>
                        <div class="values row">${nest.purpose}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Description</div>
                        <div class="values row">${nest.description}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Provenance</div>
                        <div class="values row">${nest.provenance}</div>
                    </div>
                    <div class="column">
                        <div class="keys row">Controller</div>
                        <div class="values row">${nest.controller}</div>
                    </div>
                </div>
            `);
        }
    }
    
    this.goToDetails = document.getElementById("goToDetails");
    this.storageLabel = document.getElementById("storageLabel");
    if (this.goToDetails && this.storageLabel)
    this.goToDetails.addEventListener('click', () => this.storageLabel.scrollIntoView({behavior:"smooth", block:"start", inline:"start"}));
    
    this.topButtons = document.getElementsByClassName("top");
    for (let i = 0; i < this.topButtons.length; i++) {
        this.topButtons.item(i).addEventListener('click', () => this.optionList.scrollIntoView({behavior:"smooth", block:"start", inline:"start"}));
    }
};