import * as THREE from "three";

import { OrbitControls } from
    "three/addons/controls/OrbitControls.js";

import { TransformControls } from
    "three/addons/controls/TransformControls.js";

import { GLTFLoader } from
    "three/addons/loaders/GLTFLoader.js";

import { RoomEnvironment } from
    "three/addons/environments/RoomEnvironment.js";


const interfaceLanguage =
    document.documentElement.lang
        .toLowerCase()
        .split("-")[0];

const viewerText = interfaceLanguage === "ar"
    ? {
        loading: (percentage) =>
            `جارٍ تحميل النموذج ثلاثي الأبعاد… ${percentage}%`,
        loadError:
            "تعذّر تحميل النموذج ثلاثي الأبعاد.",
        explode: "تفكيك",
        assemble: "تجميع",
        noPart: "لم يتم تحديد أي جزء",
        unnamedPart: "مكوّن بلا اسم",
        canvasLabel: "النموذج التفاعلي للركبة الروبوتية",
        selected: (name) => `المحدّد: ${name}`
    }
    : interfaceLanguage === "sv"
    ? {
        loading: (percentage) =>
            `Laddar 3D-modellen… ${percentage}%`,
        loadError: "Det gick inte att ladda 3D-modellen.",
        explode: "Sprängvy",
        assemble: "Sätt ihop",
        noPart: "Ingen del vald",
        unnamedPart: "Namnlös komponent",
        canvasLabel: "Interaktiv modell av den robotbaserade knäfantomen",
        selected: (name) => `Vald: ${name}`
    }
    : {
        loading: (percentage) =>
            `Loading 3D model… ${percentage}%`,
        loadError:
            "The 3D model could not be loaded.",
        explode: "Explode",
        assemble: "Assemble",
        noPart: "No part selected",
        unnamedPart: "Unnamed component",
        canvasLabel: "Interactive robotic phantom knee model",
        selected: (name) => `Selected: ${name}`
    };


const container = document.getElementById("interactive-model");

if (container) {
    initializeViewer();
}


function initializeViewer() {
    const loadingMessage =
        document.getElementById("model-loading");

    const scene = new THREE.Scene();

    let loadedModel = null;
    let selectedPart = null;
    let selectionHelper = null;
    let interactionGuide = null;

    const selectableParts = [];
    const selectableMeshes = [];
    const partByMesh = new WeakMap();
    const partNames = new Map();

    const originalTransforms = new Map();

    let initialCameraPosition = null;
    let initialCameraTarget = null;
    let isExploded = false;
    let partAnimation = null;
    let resetAnimation = null;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const selectedPartName =
        document.getElementById("selected-part-name");
    
    const interactionHint =
        document.getElementById(
            "model-interaction-hint"
        );
    
    const controlsPrompt =
    interactionHint
        ? interactionHint.querySelector(
            ".model-controls-prompt"
        )
        : null;

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

    let modelIsReady = false;
    let viewerIsVisible = false;
    let userHasInteracted = false;
    let hintHasBeenShown = false;
    let hintTimer = null;

    let pointerStartX = 0;
    let pointerStartY = 0;
    let pointerIsDown = false;
    const activePointers = new Set();
    let multiTouchGesture = false;

    let introPromptStartTime = 0;
    let previousIntroWiggleOffset = 0;

    const cameraUpAxis = new THREE.Vector3(0, 1, 0);

    const camera = new THREE.PerspectiveCamera(
        40,
        1,
        0.01,
        1000
    );

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    renderer.setClearColor(0x000000, 0);

    container.appendChild(renderer.domElement);
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("aria-label", viewerText.canvasLabel);
    renderer.domElement.setAttribute("aria-describedby", "model-keyboard-help");
    renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        renderer.setAnimationLoop(null);
        interactionGuide?.setReady(false);
        container.dispatchEvent(new Event("model-error"));
    });

    renderer.domElement.addEventListener(
    "pointerdown",
    (event) => {
        interactionGuide?.setInput(event.pointerType);
        activePointers.add(event.pointerId);
        if (activePointers.size > 1) {
            multiTouchGesture = true;
            interactionGuide?.setContext("zoom");
        }
        pointerIsDown = true;

        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
    }
);

    renderer.domElement.addEventListener(
        "pointermove",
        (event) => {
            if (
                !pointerIsDown
            ) {
                return;
            }

            const movementDistance =
                Math.hypot(
                    event.clientX - pointerStartX,
                    event.clientY - pointerStartY
                );

            if (movementDistance > 4) {
                stopIntroMotion();
                if (!transformControls.dragging) {
                    interactionGuide?.setContext(multiTouchGesture ? "zoom" : "orbit");
                }
            }
        }
    );

    renderer.domElement.addEventListener(
        "pointerup",
        (event) => {
            activePointers.delete(event.pointerId);
            pointerIsDown = activePointers.size > 0;
            if (!multiTouchGesture) selectPartFromPointer(event);
            if (!pointerIsDown) multiTouchGesture = false;
        }
    );

    renderer.domElement.addEventListener(
        "pointercancel",
        (event) => {
            activePointers.delete(event.pointerId);
            pointerIsDown = activePointers.size > 0;
            if (!pointerIsDown) multiTouchGesture = false;
        }
    );

    renderer.domElement.addEventListener(
        "wheel",
        () => {
            stopIntroMotion();
            interactionGuide?.setInput("mouse");
            interactionGuide?.setContext("zoom");
        },
        { passive: true }
    );

    const modelToolbar =
        document.querySelector(".model-toolbar");

    if (modelToolbar) {
        modelToolbar.addEventListener(
            "pointerdown",
            stopIntroMotion
        );
    }


    /* Environment lighting */

    const environmentGenerator =
        new THREE.PMREMGenerator(renderer);

    scene.environment = environmentGenerator
        .fromScene(new RoomEnvironment(), 0.04)
        .texture;

    environmentGenerator.dispose();


    /* Additional lighting */

    const hemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0x64748b,
        1.5
    );

    scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(
        0xffffff,
        2
    );

    directionalLight.position.set(5, 8, 10);

    scene.add(directionalLight);


    /* Camera controls */

    const orbitControls = new OrbitControls(
        camera,
        renderer.domElement
    );

    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.06;
    orbitControls.autoRotate = false;
    orbitControls.autoRotateSpeed = 1.65;
    orbitControls.listenToKeyEvents(renderer.domElement);
    renderer.domElement.addEventListener("keydown", (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (["+", "=", "-", "0", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) stopIntroMotion();
        if (["+", "=", "-"].includes(event.key)) {
            event.preventDefault();
            camera.position.sub(orbitControls.target).multiplyScalar(event.key === "-" ? 1.12 : 1 / 1.12).add(orbitControls.target);
            orbitControls.update();
            interactionGuide?.setContext("zoom");
        } else if (event.key === "0") {
            event.preventDefault();
            resetModel();
        } else if (event.key.startsWith("Arrow")) {
            interactionGuide?.setContext("pan");
        }
    });
    const partSelect = document.getElementById("model-part-select");
    partSelect?.addEventListener("change", () => {
        stopIntroMotion();
        const part = partSelect.value === "" ? null : selectableParts[Number(partSelect.value)];
        if (part) part.visible = true;
        setSelectedPart(part || null);
    });

    const viewerObserver =
        new IntersectionObserver(
            (entries) => {
                viewerIsVisible =
                    entries[0].isIntersecting;

                updateIntroMotion();
            },
            {
                threshold: 0.45
            }
        );

    viewerObserver.observe(container);

    let activeTransformMode = "select";

    const transformControls = new TransformControls(
        camera,
        renderer.domElement
    );

    transformControls.setSpace("local");
    transformControls.setSize(0.8);

    scene.add(transformControls.getHelper());

    transformControls.addEventListener(
        "dragging-changed",
        (event) => {
            orbitControls.enabled = !event.value;
        }
    );

    document
        .querySelectorAll("[data-transform-mode]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                setTransformMode(
                    button.dataset.transformMode
                );
            });
        });
    
    const resetButton = document.querySelector(
        '[data-model-action="reset"]'
    );

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetModel
        );
    }

    const explodeButton = document.querySelector(
    '[data-model-action="explode"]'
    );

    if (explodeButton) {
        explodeButton.addEventListener(
            "click",
            toggleExplodedView
        );
    }

    const hideButton = document.querySelector(
        '[data-model-action="hide"]'
    );

    const showAllButton = document.querySelector(
        '[data-model-action="show-all"]'
    );

    if (hideButton) {
        hideButton.addEventListener(
            "click",
            hideSelectedPart
        );
    }

    if (showAllButton) {
        showAllButton.addEventListener(
            "click",
            showAllParts
        );
    }

    interactionGuide = createModelGuide({
        container,
        toolbar: modelToolbar,
        handSource: controlsPrompt?.src || new URL("../images/model-viewer-hand-prompt.svg", import.meta.url).href,
        language: interfaceLanguage,
        onOpen: stopIntroMotion
    });

    /* Load the GLB model */

    const modelLoader = new GLTFLoader();

    const modelUrl = new URL(
        "../models/robotic-phantom-knee.glb",
        import.meta.url
    ).href;

    modelLoader.load(
        modelUrl,

        (gltf) => {
            const model = gltf.scene;

            loadedModel = model;

            // A Blender object may contain several glTF material primitives.
            // Manipulate its original node so those materials stay together.
            buildModelComponents(gltf).forEach((component) => {
                selectableParts.push(component.object);
                partNames.set(component.object, component.name);
                component.meshes.forEach((mesh) => {
                    selectableMeshes.push(mesh);
                    partByMesh.set(mesh, component.object);
                });
            });

            centreModel(model);

            selectableParts.forEach((part) => {
                originalTransforms.set(part, {
                    position: part.position.clone(),
                    quaternion: part.quaternion.clone(),
                    scale: part.scale.clone()
                });
            });

            scene.add(model);

            fitCameraToModel(
                camera,
                orbitControls,
                model
            );

            initialCameraPosition =
                camera.position.clone();

            initialCameraTarget =
                orbitControls.target.clone();

            if (loadingMessage) {
                loadingMessage.hidden = true;
            }

            if (partSelect) {
                selectableParts.forEach((part, index) => {
                    const option = document.createElement("option");
                    option.value = String(index);
                    option.textContent = getPartName(part);
                    partSelect.appendChild(option);
                });
            }
            modelIsReady = true;
            interactionGuide.setReady(true);
            container.dispatchEvent(new Event("model-ready"));
            updateIntroMotion();
        },

        (progress) => {
            if (
                loadingMessage &&
                progress.total > 0
            ) {
                const percentage = Math.round(
                    progress.loaded /
                    progress.total *
                    100
                );

                loadingMessage.textContent =
                    viewerText.loading(percentage);
            }
        },

        (error) => {
            console.error(
                "Unable to load the 3D model:",
                error
            );

            if (loadingMessage) {
                loadingMessage.textContent =
                    viewerText.loadError;
            }
            renderer.setAnimationLoop(null);
            interactionGuide?.setReady(false);
            container.dispatchEvent(new Event("model-error"));
        }
    );

    function hideSelectedPart() {
        if (!selectedPart) {
            return;
        }

        const partToHide = selectedPart;

        setSelectedPart(null);

    partToHide.visible = false;
    interactionGuide?.setContext("visibility");
    }


    function showAllParts() {
        selectableParts.forEach((part) => {
            part.visible = true;
        });
        interactionGuide?.setContext("visibility");
    }
    
    function toggleExplodedView() {
    if (!loadedModel) {
        return;
    }

    transformControls.detach();
    setSelectedPart(null);
    setTransformMode("select");

    if (isExploded) {
        const assembledPositions = new Map();

        originalTransforms.forEach(
            (transform, part) => {
                assembledPositions.set(
                    part,
                    transform.position.clone()
                );
            }
        );

        animatePartPositions(
            assembledPositions
        );

        isExploded = false;
        interactionGuide?.setContext("orbit");

        if (explodeButton) {
            explodeButton.textContent =
                viewerText.explode;
        }

        return;
    }

        restoreOriginalTransforms();
        showAllParts();
    loadedModel.updateMatrixWorld(true);

    const assemblyBounds =
        new THREE.Box3().setFromObject(
            loadedModel
        );

    const assemblyCentre =
        assemblyBounds.getCenter(
            new THREE.Vector3()
        );

    const assemblySize =
        assemblyBounds.getSize(
            new THREE.Vector3()
        );

    const explosionDistance =
        Math.max(
            assemblySize.x,
            assemblySize.y,
            assemblySize.z
        ) * 0.3;

    const explodedPositions = new Map();

    selectableParts.forEach((part, index) => {
        const partCentre =
            new THREE.Box3()
                .setFromObject(part)
                .getCenter(
                    new THREE.Vector3()
                );

        const direction =
            partCentre.sub(assemblyCentre);

        if (direction.lengthSq() < 0.000001) {
            const angle =
                index /
                Math.max(
                    selectableParts.length,
                    1
                ) *
                Math.PI *
                2;

            direction.set(
                Math.cos(angle),
                Math.sin(angle),
                0.5
            );
        }

        direction.normalize();

        const worldPosition =
            part.getWorldPosition(
                new THREE.Vector3()
            );

        const explodedWorldPosition =
            worldPosition.add(
                direction.multiplyScalar(
                    explosionDistance
                )
            );

        const explodedLocalPosition =
            part.parent.worldToLocal(
                explodedWorldPosition.clone()
            );

        explodedPositions.set(
            part,
            explodedLocalPosition
        );
    });

    animatePartPositions(
    explodedPositions
    );

    isExploded = true;
    interactionGuide?.setContext("explode");

    if (explodeButton) {
        explodeButton.textContent =
            viewerText.assemble;
    }
    }
    
    function animatePartPositions(
    targetPositions
) {
    const startPositions = new Map();

    targetPositions.forEach(
        (targetPosition, part) => {
            startPositions.set(
                part,
                part.position.clone()
            );
        }
    );

    partAnimation = {
        startTime: performance.now(),
        duration: prefersReducedMotion ? 1 : 700,
        startPositions,
        targetPositions
    };
}


function updatePartAnimation(time) {
    if (!partAnimation) {
        return;
    }

    const progress = Math.min(
        (time - partAnimation.startTime) /
        partAnimation.duration,
        1
    );

    const easedProgress =
        progress *
        progress *
        (3 - 2 * progress);

    partAnimation.targetPositions.forEach(
        (targetPosition, part) => {
            const startPosition =
                partAnimation
                    .startPositions
                    .get(part);

            part.position.lerpVectors(
                startPosition,
                targetPosition,
                easedProgress
            );
        }
    );

    if (loadedModel) {
        loadedModel.updateMatrixWorld(true);
    }

    if (progress >= 1) {
        partAnimation = null;
    }
    }
    
    function updateResetAnimation(time) {
    if (!resetAnimation) {
        return;
    }

    const progress = Math.min(
        (time - resetAnimation.startTime) /
        resetAnimation.duration,
        1
    );

    const easedProgress =
        progress *
        progress *
        (3 - 2 * progress);

    originalTransforms.forEach(
        (targetTransform, part) => {
            const startTransform =
                resetAnimation
                    .startTransforms
                    .get(part);

            part.position.lerpVectors(
                startTransform.position,
                targetTransform.position,
                easedProgress
            );

            part.quaternion.slerpQuaternions(
                startTransform.quaternion,
                targetTransform.quaternion,
                easedProgress
            );

            part.scale.lerpVectors(
                startTransform.scale,
                targetTransform.scale,
                easedProgress
            );
        }
    );

    if (
        initialCameraPosition &&
        initialCameraTarget
    ) {
        camera.position.lerpVectors(
            resetAnimation
                .startCameraPosition,
            initialCameraPosition,
            easedProgress
        );

        orbitControls.target.lerpVectors(
            resetAnimation
                .startCameraTarget,
            initialCameraTarget,
            easedProgress
        );
    }

    loadedModel.updateMatrixWorld(true);

    if (progress >= 1) {
        resetAnimation = null;
    }
    }
    
    function restoreOriginalTransforms() {
    originalTransforms.forEach(
        (transform, part) => {
            part.position.copy(
                transform.position
            );

            part.quaternion.copy(
                transform.quaternion
            );

            part.scale.copy(
                transform.scale
            );
        }
    );

    if (loadedModel) {
        loadedModel.updateMatrixWorld(true);
    }
    }

    function getIntroWiggleOffset(elapsedTime) {
        const frame = (elapsedTime / 5000) * 38;

        if (frame <= 5) {
            const progress = frame / 5;
            const smoothProgress =
                progress * progress * (3 - 2 * progress);

            return THREE.MathUtils.lerp(
                0,
                -1,
                smoothProgress
            );
        }

        if (frame <= 6) {
            return -1;
        }

        if (frame <= 14) {
            const progress = (frame - 6) / 8;
            const smoothProgress =
                progress * progress * (3 - 2 * progress);

            return THREE.MathUtils.lerp(
                -1,
                1,
                smoothProgress
            );
        }

        if (frame <= 15) {
            return 1;
        }

        if (frame <= 20) {
            const progress = (frame - 15) / 5;
            const smoothProgress =
                progress * progress * (3 - 2 * progress);

            return THREE.MathUtils.lerp(
                1,
                0,
                smoothProgress
            );
        }

        return 0;
    }


    function applyIntroWiggle(currentTime) {
        const promptIsVisible =
            interactionHint &&
            interactionHint.classList.contains(
                "is-visible"
            );

        let nextOffset = 0;

        if (
            promptIsVisible &&
            !userHasInteracted &&
            introPromptStartTime > 0
        ) {
            const elapsedTime =
                currentTime - introPromptStartTime;

            const loopedElapsedTime =
                elapsedTime % 5000;

            nextOffset =
                getIntroWiggleOffset(
                    loopedElapsedTime
                );
        }

        /*
        * Move the hand by 5% of the viewer width,
        * matching the original model-viewer prompt.
        */
        if (controlsPrompt) {
            const handOffset =
                nextOffset *
                container.clientWidth *
                0.05;

            controlsPrompt.style.transform =
                `translateX(${handOffset}px)`;
        }

        /*
        * Apply the exact same offset to the camera.
        */
        const angleChange =
            (previousIntroWiggleOffset - nextOffset) *
            (Math.PI / 16);

        if (Math.abs(angleChange) > 0.000001) {
            const cameraOffset =
                camera.position
                    .clone()
                    .sub(orbitControls.target);

            cameraOffset.applyAxisAngle(
                cameraUpAxis,
                angleChange
            );

            camera.position
                .copy(orbitControls.target)
                .add(cameraOffset);
        }

        previousIntroWiggleOffset = nextOffset;
    }
    
    function updateIntroMotion() {
        const shouldRun =
            modelIsReady &&
            viewerIsVisible &&
            !userHasInteracted &&
            !prefersReducedMotion;

        orbitControls.autoRotate = shouldRun;

        if (shouldRun && interactionHint) {
            const promptWasHidden =
                !interactionHint.classList.contains(
                    "is-visible"
                );

            if (promptWasHidden) {
                introPromptStartTime =
                    performance.now();

                previousIntroWiggleOffset = 0;
            }

            interactionHint.classList.add(
                "is-visible"
            );
        } else if (interactionHint) {
            interactionHint.classList.remove(
                "is-visible"
            );
        }
    }

    function stopIntroMotion() {
        userHasInteracted = true;
        orbitControls.autoRotate = false;

        if (hintTimer) {
            window.clearTimeout(hintTimer);
            hintTimer = null;
        }

        if (interactionHint) {
            interactionHint.classList.remove(
                "is-visible"
            );
        }
    }

    function resetModel() {
    if (!loadedModel) {
        return;
    }

    partAnimation = null;

    setSelectedPart(null);
    setTransformMode("select");
    showAllParts();

    const startTransforms = new Map();

    originalTransforms.forEach(
        (targetTransform, part) => {
            startTransforms.set(part, {
                position: part.position.clone(),
                quaternion:
                    part.quaternion.clone(),
                scale: part.scale.clone()
            });
        }
    );

    resetAnimation = {
        startTime: performance.now(),
        duration: prefersReducedMotion ? 1 : 400,
        startTransforms,

        startCameraPosition:
            camera.position.clone(),

        startCameraTarget:
            orbitControls.target.clone()
    };

    isExploded = false;
    interactionGuide?.setContext("reset");

    if (explodeButton) {
        explodeButton.textContent =
            viewerText.explode;
    }
    }
    
    function setTransformMode(mode) {
    activeTransformMode = mode;
    interactionGuide?.setContext(
        !selectedPart ? "select" : mode === "translate" ? "move" : mode === "rotate" ? "rotate" : "select"
    );

    document
        .querySelectorAll("[data-transform-mode]")
        .forEach((button) => {
            const isActive =
                button.dataset.transformMode === mode;

            button.classList.toggle(
                "is-active",
                isActive
            );

            button.setAttribute(
                "aria-pressed",
                String(isActive)
            );
        });

    if (
        mode === "select" ||
        !selectedPart
    ) {
        transformControls.detach();
        return;
    }

    transformControls.setMode(mode);
    transformControls.attach(selectedPart);
    }
    
    function selectPartFromPointer(event) {
    const pointerMovement = Math.hypot(
        event.clientX - pointerStartX,
        event.clientY - pointerStartY
    );

    if (pointerMovement > 5 || !loadedModel) {
        return;
    }

    const bounds =
        renderer.domElement.getBoundingClientRect();

    pointer.x =
        ((event.clientX - bounds.left) /
        bounds.width) * 2 - 1;

    pointer.y =
        -((event.clientY - bounds.top) /
        bounds.height) * 2 + 1;

    raycaster.setFromCamera(pointer, camera);

    const intersections =
        raycaster.intersectObjects(
            selectableMeshes.filter(isVisibleInHierarchy),
            false
        );

    if (intersections.length === 0) {
        setSelectedPart(null);
        return;
    }

    setSelectedPart(partByMesh.get(intersections[0].object) || null);
}

function getPartName(part) {
    return (partNames.get(part) || part.name || "")
        .replaceAll("_", " ").trim() || viewerText.unnamedPart;
}

function setSelectedPart(part) {
    selectedPart = part;
    interactionGuide?.setContext(
        !part ? "orbit" : activeTransformMode === "translate" ? "move" : activeTransformMode === "rotate" ? "rotate" : "select"
    );
    if (partSelect) partSelect.value = part ? String(selectableParts.indexOf(part)) : "";

    if (hideButton) {
        hideButton.disabled = !selectedPart;
    }

    if (selectionHelper) {
        scene.remove(selectionHelper);
        selectionHelper.geometry.dispose();
        selectionHelper.material.dispose();
        selectionHelper = null;
    }

    transformControls.detach();

    if (!selectedPart) {
        if (selectedPartName) {
            selectedPartName.textContent =
                viewerText.noPart;
        }

        return;
    }

    selectionHelper = new THREE.BoxHelper(
        selectedPart,
        0x2563eb
    );

    selectionHelper.material.depthTest = false;
    selectionHelper.renderOrder = 1000;

    scene.add(selectionHelper);

    const readableName = getPartName(selectedPart);

    if (selectedPartName) {
        selectedPartName.textContent =
            viewerText.selected(readableName);
    }

    if (activeTransformMode !== "select") {
        transformControls.setMode(
            activeTransformMode
        );

        transformControls.attach(
            selectedPart
        );
    }
}
    
    /* Responsive rendering */

    function resizeViewer() {
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (!width || !height) {
            return;
        }

        renderer.setSize(width, height, false);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    const resizeObserver =
        new ResizeObserver(resizeViewer);

    resizeObserver.observe(container);

    resizeViewer();


    /* Rendering loop */

    function render(time) {
        if (!viewerIsVisible || document.hidden) return;
        updatePartAnimation(time);
        updateResetAnimation(time);
        applyIntroWiggle(time);
        orbitControls.update();

        if (selectionHelper) {
            selectionHelper.update();
        }

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(render);
}


// Use loader node identity rather than stripping numbers from names: two
// separate fittings can legitimately share a name or numbered Blender suffix.
function buildModelComponents(gltf) {
    const components = new Map();
    const associations = gltf.parser?.associations;
    const nodeDefinitions = gltf.parser?.json?.nodes || [];

    gltf.scene.traverse((mesh) => {
        if (!mesh.isMesh) return;

        let object = mesh;
        let definition;
        for (let ancestor = mesh; ancestor && ancestor !== gltf.scene; ancestor = ancestor.parent) {
            const nodeIndex = associations?.get(ancestor)?.nodes;
            if (Number.isInteger(nodeIndex) && nodeDefinitions[nodeIndex]?.mesh !== undefined) {
                object = ancestor;
                definition = nodeDefinitions[nodeIndex];
                break;
            }
        }

        if (!components.has(object)) {
            components.set(object, {
                object,
                name: definition?.name || object.userData?.name || object.name || "",
                meshes: []
            });
        }
        components.get(object).meshes.push(mesh);
    });

    return [...components.values()];
}

function isVisibleInHierarchy(object) {
    for (let current = object; current; current = current.parent) {
        if (!current.visible) return false;
    }
    return true;
}

function centreModel(model) {
    const boundingBox =
        new THREE.Box3().setFromObject(model);

    const centre =
        boundingBox.getCenter(new THREE.Vector3());

    model.position.sub(centre);
}


function fitCameraToModel(camera, controls, model) {
    const boundingBox =
        new THREE.Box3().setFromObject(model);

    const size =
        boundingBox.getSize(new THREE.Vector3());

    const maximumDimension = Math.max(
        size.x,
        size.y,
        size.z
    );

    const fieldOfView =
        THREE.MathUtils.degToRad(camera.fov);

    const distance =
        maximumDimension /
        (2 * Math.tan(fieldOfView / 2)) *
        1.35;

    camera.position.set(
        distance,
        distance * 0.55,
        distance
    );

    camera.near = Math.max(
        maximumDimension / 1000,
        0.001
    );

    camera.far = maximumDimension * 100;

    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);

    controls.minDistance =
        maximumDimension * 0.2;

    controls.maxDistance =
        maximumDimension * 8;

    controls.update();
}

// Optional, contextual help. It describes actions without performing them.
function createModelGuide({ container, toolbar, handSource, language, onOpen }) {
    let touch = window.matchMedia("(pointer: coarse)").matches;
    const translations = {
        en: {
            help: "Guide", title: "Interaction guide", close: "Close interaction guide", topic: "What would you like to do?",
            keyboard: "Keyboard: focus the model with Tab. Arrows pan, + / − zoom, and 0 resets.",
            topics: {
                orbit: { label: "Rotate the view", status: "Drag to look around", gesture: "Drag", desktop: "Hold the left mouse button and drag over the model. This rotates your view, while the components stay in place.", touch: "Drag over the model with one finger to look around. The components stay in place." },
                zoom: { label: "Zoom in or out", status: "Zoom to inspect the details", gesture: "Zoom", desktop: "Scroll the mouse wheel over the model. You can also focus the model and press + or −.", touch: "Spread two fingers to zoom in, or pinch them together to zoom out." },
                pan: { label: "Pan the view", status: "Pan to reposition the view", gesture: "Pan", desktop: "Hold the right mouse button and drag, or focus the model and use the arrow keys. This shifts the view sideways or vertically.", touch: "Drag with two fingers together to shift the view sideways or vertically." },
                select: { label: "Select a component", status: "Select a complete component", gesture: "Select", desktop: "Click a component or choose it from the component list above. The outline includes all of its material pieces. Click empty space to clear the selection.", touch: "Tap a component or choose it from the list above. All of its material pieces are selected together. Tap empty space to clear the selection." },
                move: { label: "Move a component", status: "Drag a coloured arrow to move the part", gesture: "Move", desktop: "Select a component, choose Move, then drag a coloured arrow to move along that axis. Drag a small square handle to move in a plane.", touch: "Select a component, choose Move, then drag a coloured arrow along its axis. The entire component moves together." },
                rotate: { label: "Rotate a component", status: "Drag a coloured ring to rotate the part", gesture: "Rotate", desktop: "Select a component, choose Rotate, then drag a coloured ring. This rotates the complete component rather than the camera view.", touch: "Select a component, choose Rotate, then drag a coloured ring to turn the complete component." },
                explode: { label: "Explode or reassemble", status: "Explore the separated components", gesture: "Separate", desktop: "Choose Explode to spread the components apart while keeping each component's materials together. Choose Assemble to bring them back, or Reset to restore the full starting state.", touch: "Tap Explode to separate the complete components. Tap Assemble to bring them back, or Reset to restore the full starting state." },
                visibility: { label: "Hide or show components", status: "Hide a part to see behind it", gesture: "Hide / show", desktop: "Select a component and choose Hide Part to reveal what is behind it. Show All restores every hidden component. Choosing a hidden component in the list also reveals it.", touch: "Select a component and tap Hide Part. Tap Show All to restore hidden components, or choose a hidden component from the list to reveal it." },
                reset: { label: "Reset the model", status: "Reset restores the assembly and view", gesture: "Reset", desktop: "Choose Reset to restore all component positions, rotations and visibility, and the original camera view. You can also focus the model and press 0.", touch: "Tap Reset to restore all component positions, rotations and visibility, and the original camera view." }
            }
        },
        sv: {
            help: "Hjälp", title: "Guide till 3D-visningen", close: "Stäng guiden", topic: "Vad vill du göra?",
            keyboard: "Tangentbord: fokusera modellen med Tab. Piltangenter panorerar, + / − zoomar och 0 återställer.",
            topics: {
                orbit: { label: "Rotera vyn", status: "Dra för att se modellen från olika håll", gesture: "Dra", desktop: "Håll ned vänster musknapp och dra över modellen. Vyn roteras medan komponenterna ligger kvar på sina platser.", touch: "Dra med ett finger över modellen för att se den från olika håll. Komponenterna ligger kvar på sina platser." },
                zoom: { label: "Zooma in eller ut", status: "Zooma för att granska detaljer", gesture: "Zooma", desktop: "Rulla mushjulet över modellen. Du kan också fokusera modellen och trycka på + eller −.", touch: "För två fingrar isär för att zooma in, eller nyp ihop dem för att zooma ut." },
                pan: { label: "Panorera vyn", status: "Panorera för att flytta vyn", gesture: "Panorera", desktop: "Håll ned höger musknapp och dra, eller fokusera modellen och använd piltangenterna. Vyn flyttas i sidled eller höjdled.", touch: "Dra med två fingrar tillsammans för att flytta vyn i sidled eller höjdled." },
                select: { label: "Välj en komponent", status: "Välj en hel komponent", gesture: "Välj", desktop: "Klicka på en komponent eller välj den i listan ovan. Markeringen omfattar alla dess materialdelar. Klicka på en tom yta för att avmarkera.", touch: "Tryck på en komponent eller välj den i listan ovan. Alla dess materialdelar markeras tillsammans. Tryck på en tom yta för att avmarkera." },
                move: { label: "Flytta en komponent", status: "Dra en färgad pil för att flytta delen", gesture: "Flytta", desktop: "Välj en komponent, välj Flytta och dra sedan en färgad pil längs dess axel. Dra ett litet fyrkantigt handtag för att flytta i ett plan.", touch: "Välj en komponent, välj Flytta och dra sedan en färgad pil längs dess axel. Hela komponenten flyttas tillsammans." },
                rotate: { label: "Rotera en komponent", status: "Dra en färgad ring för att rotera delen", gesture: "Rotera", desktop: "Välj en komponent, välj Rotera och dra sedan en färgad ring. Då roteras hela komponenten i stället för kameravyn.", touch: "Välj en komponent, välj Rotera och dra sedan en färgad ring för att vrida hela komponenten." },
                explode: { label: "Visa sprängvy eller sätt ihop", status: "Utforska de separerade komponenterna", gesture: "Separera", desktop: "Välj Sprängvy för att separera komponenterna medan varje komponents materialdelar hålls ihop. Välj Sätt ihop för att föra tillbaka dem, eller Återställ för att återgå till ursprungsläget.", touch: "Tryck på Sprängvy för att separera de hela komponenterna. Tryck på Sätt ihop för att föra tillbaka dem, eller Återställ för att återgå till ursprungsläget." },
                visibility: { label: "Dölj eller visa komponenter", status: "Dölj en del för att se bakom den", gesture: "Dölj / visa", desktop: "Välj en komponent och sedan Dölj delen för att se bakom den. Visa alla återställer alla dolda komponenter. En dold komponent visas också om du väljer den i listan.", touch: "Välj en komponent och tryck på Dölj delen. Tryck på Visa alla för att visa dolda komponenter, eller välj en dold komponent i listan." },
                reset: { label: "Återställ modellen", status: "Återställ konstruktionen och vyn", gesture: "Återställ", desktop: "Välj Återställ för att återställa alla komponenters position, rotation och synlighet samt kamerans ursprungliga vy. Du kan också fokusera modellen och trycka på 0.", touch: "Tryck på Återställ för att återställa alla komponenters position, rotation och synlighet samt kamerans ursprungliga vy." }
            }
        },
        ar: {
            help: "الدليل", title: "دليل التفاعل مع النموذج", close: "إغلاق دليل التفاعل", topic: "ماذا تريد أن تفعل؟",
            keyboard: "لوحة المفاتيح: انتقل إلى النموذج بزر Tab. الأسهم لتحريك العرض، و+ / − للتقريب والإبعاد، و0 لإعادة الضبط.",
            topics: {
                orbit: { label: "تدوير زاوية العرض", status: "اسحب لرؤية النموذج من زوايا مختلفة", gesture: "اسحب", desktop: "اضغط بزر الفأرة الأيسر واسحب فوق النموذج لتدوير زاوية العرض. تبقى المكوّنات في أماكنها.", touch: "اسحب بإصبع واحد فوق النموذج لرؤيته من زوايا مختلفة. تبقى المكوّنات في أماكنها." },
                zoom: { label: "التقريب والإبعاد", status: "قرّب العرض لفحص التفاصيل", gesture: "تقريب", desktop: "حرّك عجلة الفأرة فوق النموذج. يمكنك أيضاً تحديد منطقة النموذج ثم الضغط على + أو −.", touch: "باعد بين إصبعين للتقريب، أو قرّبهما من بعضهما للإبعاد." },
                pan: { label: "إزاحة العرض", status: "حرّك العرض جانبياً أو عمودياً", gesture: "إزاحة", desktop: "اضغط بزر الفأرة الأيمن واسحب، أو حدّد منطقة النموذج واستخدم مفاتيح الأسهم. تتحرك زاوية العرض جانبياً أو عمودياً.", touch: "اسحب بإصبعين معاً لإزاحة العرض جانبياً أو عمودياً." },
                select: { label: "اختيار مكوّن", status: "اختر المكوّن كاملاً", gesture: "اختيار", desktop: "انقر على مكوّن أو اختره من القائمة أعلاه. يشمل إطار التحديد جميع أجزائه ذات المواد المختلفة. انقر في مساحة فارغة لإلغاء التحديد.", touch: "المس مكوّناً أو اختره من القائمة أعلاه. تُحدَّد جميع أجزائه ذات المواد المختلفة معاً. المس مساحة فارغة لإلغاء التحديد." },
                move: { label: "تحريك مكوّن", status: "اسحب سهماً ملوّناً لتحريك المكوّن", gesture: "تحريك", desktop: "اختر مكوّناً، ثم «تحريك»، واسحب سهماً ملوّناً للتحريك على محوره. اسحب مقبضاً مربعاً صغيراً للتحريك ضمن مستوى.", touch: "اختر مكوّناً، ثم «تحريك»، واسحب سهماً ملوّناً على محوره. يتحرك المكوّن كاملاً بجميع أجزائه." },
                rotate: { label: "تدوير مكوّن", status: "اسحب حلقة ملوّنة لتدوير المكوّن", gesture: "تدوير", desktop: "اختر مكوّناً، ثم «تدوير»، واسحب حلقة ملوّنة. تدور هنا جميع أجزاء المكوّن نفسه، وليس زاوية عرض الكاميرا.", touch: "اختر مكوّناً، ثم «تدوير»، واسحب حلقة ملوّنة لتدوير المكوّن كاملاً." },
                explode: { label: "تفكيك العرض وإعادة التجميع", status: "استكشف المكوّنات بعد إبعادها عن بعضها", gesture: "تفكيك", desktop: "اختر «تفكيك» لإبعاد المكوّنات مع إبقاء مواد كل مكوّن مجتمعة. اختر «تجميع» لإعادتها، أو «إعادة الضبط» لاستعادة الحالة الأصلية بالكامل.", touch: "المس «تفكيك» لإبعاد المكوّنات الكاملة عن بعضها. المس «تجميع» لإعادتها، أو «إعادة الضبط» لاستعادة الحالة الأصلية بالكامل." },
                visibility: { label: "إخفاء المكوّنات وإظهارها", status: "أخفِ مكوّناً لرؤية ما خلفه", gesture: "إخفاء / إظهار", desktop: "اختر مكوّناً ثم «إخفاء الجزء» لرؤية ما خلفه. يعيد «إظهار الكل» جميع المكوّنات المخفية. ويمكن إظهار مكوّن مخفي باختياره من القائمة.", touch: "اختر مكوّناً ثم المس «إخفاء الجزء». المس «إظهار الكل» لاستعادة المكوّنات المخفية، أو اختر مكوّناً مخفياً من القائمة لإظهاره." },
                reset: { label: "إعادة ضبط النموذج", status: "إعادة الضبط تستعيد التجميع وزاوية العرض", gesture: "إعادة الضبط", desktop: "اختر «إعادة الضبط» لاستعادة مواقع المكوّنات ودورانها وإظهارها وزاوية الكاميرا الأصلية. يمكنك أيضاً تحديد منطقة النموذج والضغط على 0.", touch: "المس «إعادة الضبط» لاستعادة مواقع المكوّنات ودورانها وإظهارها وزاوية الكاميرا الأصلية." }
            }
        }
    };
    const copy = translations[language] || translations.en;
    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }
    const dock = element("div", "model-guide-dock");
    dock.hidden = true;
    const status = element("p", "model-guide-status", copy.topics.orbit.status);
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
    const toggle = element("button", "model-guide-toggle", copy.help);
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "model-guide-panel");
    dock.append(status, toggle);

    const panel = element("div", "model-guide-panel");
    panel.id = "model-guide-panel";
    panel.hidden = true;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-labelledby", "model-guide-title");
    const headingRow = element("div", "model-guide-heading");
    const title = element("h3", "", copy.title);
    title.id = "model-guide-title";
    const close = element("button", "model-guide-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", copy.close);
    headingRow.append(title, close);
    const label = element("label", "model-guide-label", copy.topic);
    label.htmlFor = "model-guide-topic";
    const topicSelect = element("select", "model-guide-topic");
    topicSelect.id = "model-guide-topic";
    for (const [key, topic] of Object.entries(copy.topics)) {
        const option = element("option", "", topic.label);
        option.value = key;
        topicSelect.append(option);
    }
    const demo = element("div", "model-guide-demo");
    demo.setAttribute("aria-hidden", "true");
    demo.dir = "ltr";
    demo.dataset.input = touch ? "touch" : "mouse";
    const arrow = element("span", "model-guide-arrow", "↔");
    const hands = ["first", "second"].map((name) => {
        const hand = element("img", `model-guide-hand model-guide-hand-${name}`);
        hand.src = handSource;
        hand.alt = "";
        return hand;
    });
    const axes = element("span", "model-guide-axes");
    for (const axis of ["X", "Y", "Z"]) axes.append(element("span", "", axis));
    const gesture = element("span", "model-guide-gesture");
    gesture.dir = language === "ar" ? "rtl" : "ltr";
    demo.append(arrow, ...hands, axes, gesture);
    const instruction = element("p", "model-guide-instruction");
    const keyboard = element("p", "model-guide-keyboard", copy.keyboard);
    panel.append(headingRow, label, topicSelect, demo, instruction, keyboard);
    container.append(dock, panel);

    const targets = {
        select: '#model-part-select', move: '[data-transform-mode="translate"]',
        rotate: '[data-transform-mode="rotate"]', explode: '[data-model-action="explode"]',
        visibility: '[data-model-action="hide"], [data-model-action="show-all"]', reset: '[data-model-action="reset"]'
    };
    let context = "orbit";
    let manualTopic = false;
    function clearHighlights() {
        toolbar?.querySelectorAll(".is-guided").forEach((control) => control.classList.remove("is-guided"));
    }
    function renderTopic(key) {
        const topic = copy.topics[key];
        if (!topic) return;
        topicSelect.value = key;
        instruction.textContent = touch ? topic.touch : topic.desktop;
        demo.dataset.gesture = key;
        gesture.textContent = topic.gesture;
        arrow.textContent = { rotate: "⟳", reset: "↶", visibility: "◌", select: "", move: "↗" }[key] ?? "↔";
        if (key === "zoom" && !touch) arrow.textContent = "↕";
        clearHighlights();
        if (!panel.hidden && targets[key]) {
            toolbar?.querySelectorAll(targets[key]).forEach((control) => control.classList.add("is-guided"));
        }
    }
    function closePanel(restoreFocus = false) {
        panel.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
        manualTopic = false;
        clearHighlights();
        if (restoreFocus) toggle.focus({ preventScroll: true });
    }
    toggle.addEventListener("click", () => {
        if (!panel.hidden) {
            closePanel();
        } else {
            onOpen();
            panel.hidden = false;
            toggle.setAttribute("aria-expanded", "true");
            manualTopic = false;
            renderTopic(context);
        }
    });
    close.addEventListener("click", () => closePanel(true));
    container.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.hidden) {
            event.preventDefault();
            event.stopPropagation();
            closePanel(true);
        }
    });
    topicSelect.addEventListener("change", () => {
        manualTopic = true;
        renderTopic(topicSelect.value);
    });
    renderTopic(context);
    return {
        setInput(pointerType) {
            if (!["mouse", "touch", "pen"].includes(pointerType)) return;
            const nextTouch = pointerType === "touch";
            if (nextTouch === touch) return;
            touch = nextTouch;
            demo.dataset.input = touch ? "touch" : "mouse";
            renderTopic(topicSelect.value);
        },
        setReady(ready) {
            dock.hidden = !ready;
            if (!ready) closePanel();
        },
        setContext(key) {
            if (!copy.topics[key] || context === key) return;
            context = key;
            status.textContent = copy.topics[key].status;
            if (!manualTopic) renderTopic(key);
        }
    };
}
