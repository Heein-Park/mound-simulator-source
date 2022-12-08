pc.script.createLoadingScreen(function (app) {
    var showSplash = function () {
        var body = document.body;
        body.style.backgroundColor = '#000';

        // splash wrapper
        var wrapper = document.createElement('div');
        wrapper.id = 'wrapper';
        wrapper.style.position = 'absolute';
        wrapper.style.top = '0';
        wrapper.style.left = '0';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.backgroundColor = '#000';
        document.body.appendChild(wrapper);
        
        var logo = document.createElement('img');
        logo.id = 'logo';
        logo.src = 'https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/images/play_text_252_white.png';
        logo.onload = function() {
            var imageWidth = this.offsetWidth;
            var imageHeight = this.offsetHeight;
            var vpWidth = document.documentElement.clientWidth;
            var vpHeight = document.documentElement.clientHeight;
            this.style.position = 'absolute';
            this.style.clipPath = `polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)`;
            this.style.left = `${(vpWidth - imageWidth)/2}px`;
            this.style.top = `${(vpHeight - imageHeight)/2 + window.pageYOffset}px`;
        };
        wrapper.appendChild(logo);
    };

    var hideSplash = function () {
        var splash = document.getElementById('wrapper');
        splash.parentElement.removeChild(splash);
    };

    var setProgress = function (value) {
        var logo = document.getElementById('logo');
        if(logo) {
            value = Math.min(1, Math.max(0, value * 1.1));
            logo.style.clipPath = `polygon(0% 0%, ${value * 100}% 0%, ${value * 100}% 100%, 0% 100%)`;
        }
    };
    
    showSplash();
    
    // Use an image from the assets in the project via the asset registry
    // More information: http://developer.playcanvas.com/en/api/pc.AssetRegistry.html
    
    app.on('preload:start', function () {
    });
    
    app.on('preload:end', function () {
        app.off('preload:progress');
    });
    
    app.on('preload:progress', setProgress);
    app.on('start', hideSplash);
});