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
        selected: (name) => `المحدّد: ${name}`
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

    const selectableParts = [];

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

    renderer.domElement.addEventListener(
    "pointerdown",
    (event) => {
        pointerIsDown = true;

        pointerStartX = event.clientX;
        pointerStartY = event.clientY;
    }
);

    renderer.domElement.addEventListener(
        "pointermove",
        (event) => {
            if (
                !pointerIsDown ||
                userHasInteracted
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
            }
        }
    );

    renderer.domElement.addEventListener(
        "pointerup",
        (event) => {
            pointerIsDown = false;
            selectPartFromPointer(event);
        }
    );

    renderer.domElement.addEventListener(
        "pointercancel",
        () => {
            pointerIsDown = false;
        }
    );

    renderer.domElement.addEventListener(
        "wheel",
        stopIntroMotion,
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

            model.traverse((object) => {
                if (object.isMesh) {
                    selectableParts.push(object);
                }
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

            modelIsReady = true;
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
        }
    );

    function hideSelectedPart() {
        if (!selectedPart) {
            return;
        }

        const partToHide = selectedPart;

        setSelectedPart(null);

        partToHide.visible = false;
    }


    function showAllParts() {
        selectableParts.forEach((part) => {
            part.visible = true;
        });
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
        duration: 700,
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
        duration: 400,
        startTransforms,

        startCameraPosition:
            camera.position.clone(),

        startCameraTarget:
            orbitControls.target.clone()
    };

    isExploded = false;

    if (explodeButton) {
        explodeButton.textContent =
            viewerText.explode;
    }
    }
    
    function setTransformMode(mode) {
    activeTransformMode = mode;

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
            selectableParts,
            false
        );

    if (intersections.length === 0) {
        setSelectedPart(null);
        return;
    }

    setSelectedPart(intersections[0].object);
}


function setSelectedPart(part) {
    selectedPart = part;

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

    const readableName =
        selectedPart.name
            .replaceAll("_", " ")
            .trim() ||
        viewerText.unnamedPart;

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
