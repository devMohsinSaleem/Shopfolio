import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// Renderer setup
const viewer = document.getElementById('viewer');
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setClearColor(0x000000, 1);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewer.appendChild(renderer.domElement);

// Scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.set(0.8, 0, 0.5);

// Controls for interaction
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 2.5;
controls.maxDistance = 3.5;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambientLight);

// Load GLB model
const loader = new GLTFLoader().setPath('./assets/');
loader.load('ID-Card.glb', (gltf) => {
    const model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    model.rotation.y = 180; // Rotate 180 degrees around Y axis
    scene.add(model);
}, undefined, (error) => {
    console.error('Error loading GLB:', error);
});

// Responsive resize for viewer panel
function resizeRendererToDisplaySize() {
    const width = viewer.clientWidth;
    const height = viewer.clientHeight;
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
}
window.addEventListener('resize', resizeRendererToDisplaySize);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    resizeRendererToDisplaySize();
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Typewriter effect for .loading-data elements
function typewriterEffect(element, text, speed = 10) {
    let i = 0;
    function type() {
        if (i <= text.length) {
            element.innerHTML = text.slice(0, i) + '_';
            i++;
            setTimeout(type, speed);
        } else {
            element.innerHTML = text;
        }
    }
    type();
}

// Run typewriter on all .loading-data elements in active content
function runTypewriterOnActiveContent() {
    const activeContent = document.querySelector('.content-area > .active');
    if (!activeContent) return;
    const loadingElements = activeContent.querySelectorAll('.loading-data');
    loadingElements.forEach(el => {
        const originalText = el.textContent;
        el.innerHTML = '';
        typewriterEffect(el, originalText);
    });
}

// Navbar interactivity
const navButtons = document.querySelectorAll('.navbar button');
const contentDivs = {
    home: document.getElementById('content-home'),
    about: document.getElementById('content-about'),
    projects: document.getElementById('content-projects')
};
function setActiveNav(id) {
    navButtons.forEach(btn => btn.classList.remove('active'));
    document.getElementById('nav-' + id).classList.add('active');
    Object.keys(contentDivs).forEach(key => {
        contentDivs[key].classList.toggle('active', key === id);
    });
    runTypewriterOnActiveContent();
}
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const id = btn.id.replace('nav-', '');
        setActiveNav(id);
    });
});
// Set initial content
setActiveNav('home');

// Keyword aliases and fuzzy matching
const keywordMap = {
    "Experiance": ["xp", "exp", "exparaince", "iance", "xperaince"],
    "Expertise": ["expert", "exp", "experties", "experts", "expertiese"],
    "Achievements": ["achieve", "achievements", "achievments", "achievemnts", "achiev", "achievment"],
    "Education": ["edu", "eduction", "educatoin", "educ", "edc", "edcucation"],
    "Language": ["lang", "langs", "language", "languge", "langauge", "lnguages"],
    "Awards": ["award", "awards", "awrd", "awads", "awad", "activities", "activity"]
};
const mainKeywords = Object.keys(keywordMap);

// Get all allowed keywords and aliases (for direct match)
const allowedKeywords = [];
mainKeywords.forEach(main => {
    allowedKeywords.push(main.toUpperCase());
    keywordMap[main].forEach(alias => allowedKeywords.push(alias.toUpperCase()));
});

const askInput = document.getElementById('ask-input');
const askResult = document.getElementById('ask-result');
const askResults = document.querySelector('.ask-results');
const askResultsDivs = document.querySelectorAll('.ask-results > div');

// Helper to hide all ask-results
function hideAllAskResults() {
    askResults.classList.remove('visible');
    askResultsDivs.forEach(div => {
        div.classList.remove('active');
    });
}

// Helper to show result for a keyword
function showAskResultForKeyword(mainKeyword) {
    askResults.classList.add('visible');
    askResultsDivs.forEach(div => {
        if (div.getAttribute('data-keyword').toUpperCase() === mainKeyword.toUpperCase()) {
            div.classList.add('active');
        } else {
            div.classList.remove('active');
        }
    });
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
    const matrix = [];
    let i;
    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    let j;
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

// Find main keyword from input (case-insensitive, alias support)
function findMainKeyword(query) {
    const q = query.toUpperCase();
    for (const main of mainKeywords) {
        if (main.toUpperCase() === q) return main;
        for (const alias of keywordMap[main]) {
            if (alias.toUpperCase() === q) return main;
        }
    }
    return null;
}

// Find closest keyword for "Did you mean"
function findClosestKeyword(query) {
    const q = query.toUpperCase();
    let minDist = Infinity;
    let closest = null;
    mainKeywords.forEach(main => {
        const dist = levenshtein(q, main.toUpperCase());
        if (dist < minDist) {
            minDist = dist;
            closest = main;
        }
        keywordMap[main].forEach(alias => {
            const aliasDist = levenshtein(q, alias.toUpperCase());
            if (aliasDist < minDist) {
                minDist = aliasDist;
                closest = main;
            }
        });
    });
    return minDist <= 2 ? closest : null;
}

askInput.addEventListener('input', () => {
    askResult.textContent = '';
    hideAllAskResults();
});

askInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        let query = askInput.value.trim();
        let queryUpper = query.toUpperCase();
        // Simple code injection detection
        if (/[\<\>\{\}\[\]\(\)\;\"\'\=]/.test(query)) {
            askResult.textContent = "Error: Invalid input detected.";
            hideAllAskResults();
            return;
        }
        const mainKeyword = findMainKeyword(query);
        if (mainKeyword) {
            askResult.textContent = '';
            showAskResultForKeyword(mainKeyword);
        } else if (query.length === 0) {
            askResult.textContent = '';
            hideAllAskResults();
        } else {
            // Fuzzy match for "Did you mean"
            const suggestion = findClosestKeyword(query);
            hideAllAskResults();
            if (suggestion) {
                askResult.innerHTML = `Did you mean <button class="suggestion-btn" style="color:limegreen;background:none;border:none;cursor:pointer;text-decoration:underline;">${suggestion}</button>?`;
                const btn = askResult.querySelector('.suggestion-btn');
                btn.addEventListener('click', () => {
                    askInput.value = suggestion;
                    askResult.textContent = '';
                    showAskResultForKeyword(suggestion);
                });
            } else {
                askResult.textContent = "Error: Keyword not found. Please use one of the allowed keywords.";
            }
        }
    }
});