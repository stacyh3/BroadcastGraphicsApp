function updateGraphic(id, html, show) {
    // Check if element exists
    let el = document.getElementById(id);
    
    if (!el) {
        // If not, we need to inject it. 
        // However, the HTML passed might be a full template string.
        // We need to find the container layer.
        // For simplicity in this MVP, we assume the C# side sends the target layer ID.
        console.error("Element not found: " + id);
        return;
    }

    if (show) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function injectGraphic(layerId, html) {
    const layer = document.getElementById(layerId);
    if (layer) {
        layer.innerHTML = html;
        // Execute any scripts in the injected HTML
        const scripts = layer.getElementsByTagName("script");
        for (let i = 0; i < scripts.length; i++) {
            eval(scripts[i].innerText);
        }
    }
}

function updateText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = text;
}

function setBackgroundMode(mode) {
    if (mode === 'luma') {
        document.body.classList.add('luma-key');
    } else {
        document.body.classList.remove('luma-key');
    }
}

function clearAll() {
    const layers = document.querySelectorAll('#safe-area > div');
    layers.forEach(layer => {
        stopMediaInElement(layer);
        layer.innerHTML = '';
    });
}

function clearLayer(layerId) {
    const layer = document.getElementById(layerId);
    if (layer) {
        stopMediaInElement(layer);
        layer.innerHTML = '';
    }
}

function stopMediaInElement(element) {
    // Stop all videos
    const videos = element.querySelectorAll('video');
    videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
        video.src = ''; // Release the video source
        video.load(); // Reset the video element
    });
    
    // Stop all audio
    const audios = element.querySelectorAll('audio');
    audios.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = '';
        audio.load();
    });
}