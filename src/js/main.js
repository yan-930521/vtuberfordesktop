const modelPath = "../models/sakura.vrm";

//Import Helper Functions from Kalidokit
const remap = Kalidokit.Utils.remap;
const clamp = Kalidokit.Utils.clamp;
const lerp = Kalidokit.Vector.lerp;

class AppManager {
    constructor({ holistic = {}, FPS = {}, Model = {}, Renderer = {}, fastAnimate = false, delay = 0}) {
        let { locateFile, onResults, options: holisticOptions } = holistic;

        if (!locateFile) {
            locateFile = (file) => {
                return file.endsWith("data") ? `./resources/app/src/js/${file}` : `../js/${file}`;
            }
        }
        if (!onResults) {
            onResults = (results) => {
                this.animateVRM(this.currentVrm, results);
            };
        }
        if (!holisticOptions) {
            holisticOptions = {
                modelComplexity: 1,
                smoothLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7,
                refineFaceLandmarks: true,
            }
        }

        let {
            FPSGeometry,
            FPSMaterial
        } = FPS;

        if (!FPSGeometry) {
            FPSGeometry = new THREE.PlaneGeometry(0.06, 0.03);
        }
        if (!FPSMaterial) {
            FPSMaterial = new THREE.MeshBasicMaterial({
                //color: 0xff0000,
                transparent: true,
                opacity: 0.8,
                //side: THREE.DoubleSide
            });
        }
        this.FPSGeometry = FPSGeometry;
        this.FPSMaterial = FPSMaterial;
        this.FPSMesh = new THREE.Mesh(this.FPSGeometry, this.FPSMaterial);

        this.FPSCanVas = document.createElement('canvas');

        const ctx = this.FPSCanVas.getContext('2d');
        this.FPSCanVas.width = 200;
        this.FPSCanVas.height = 100;
        this.FPSCanVas.style.position = 'absolute';
        this.FPSCanVas.style.top = '10px';
        this.FPSCanVas.style.left = '10px';
        this.FPSCanVas.style.zIndex = '999'
        this.FPSCanVas.style.display = "none";

        document.body.appendChild(this.FPSCanVas);

        let { options: rendererOptions } = Renderer;

        if (!rendererOptions) {
            rendererOptions = {
                antialias: true,
                alpha: true,
                vsync: true
            }
        }

        let { path, onLoad } = Model;

        this.scene = new THREE.Scene();

        this.videoElement = document.querySelector(".input_video");
        this.guideCanvas = document.querySelector('canvas.guides');

        this.initModelLoader();

        this.initModel({ path, onLoad })

        this.initCamera();

        this.initLight();

        this.initHolistic({ locateFile, onResults, options: holisticOptions });
        this.initRenderer({ options: rendererOptions });
        this.initOrbit();

        this.currentVrm = null;
        this.delta = 0;
        this.fastAnimate = fastAnimate;
        this.delay = delay;

        this.clock = new THREE.Clock();
        this.oldLookTarget = new THREE.Euler();

        window.addEventListener('resize', this.onResize, false);

        this.animate();
        
        setInterval(() => {
            let fps = Math.round(1 / this.delta); // 計算當前幀數
            ctx.clearRect(0, 0, this.FPSCanVas.width,  this.FPSCanVas.height); // 清空畫布
            ctx.font = `bold 30px sans-serif`;
            ctx.fillText("FPS " + fps,  this.FPSCanVas.width / 10,  this.FPSCanVas.height / 2); // 繪製文本
        }, 1000);
    }

    initModelLoader = () => {
        this.loader = new THREE.GLTFLoader();
        this.loader.crossOrigin = "anonymous";

        return this.loader;
    }

    initModel = ({ path, onLoad }) => {
        if (!onLoad) {
            onLoad = (gltf) => {
                THREE.VRMUtils.removeUnnecessaryJoints(gltf.scene);

                THREE.VRM.from(gltf).then(vrm => {
                    this.scene.add(vrm.scene);
                    this.currentVrm = vrm;
                    this.currentVrm.scene.rotation.y = Math.PI; // Rotate model 180deg to face camera
                    const faceBone = this.currentVrm.humanoid.getBoneNode(THREE.VRMSchema.HumanoidBoneName.Head);
                    //const facePosition = new THREE.Vector3();
                    //facePosition.setFromMatrixPosition(faceBone.matrixWorld);
                    this.FPSMesh.position.set(0.035, 0.02, -0.11);
                    this.FPSMesh.rotation.y = Math.PI * 300 / 360;

                    // 添加Mesh對象到VRM模型的臉頰上
                    faceBone.add(this.FPSMesh);

                    this.startCamera();
                });
            }
        }

        if (!this.loader) throw new Error("請先初始化loader");

        this.loader.load(
            path,
            onLoad,
            progress =>
                console.log(
                    "Loading model...",
                    100.0 * (progress.loaded / progress.total),
                    "%"
                ),
            error => console.error(error)
        );
    }

    initHolistic = ({ locateFile, onResults, options = {} }) => {
        this.holistic = new Holistic({
            locateFile: locateFile
        });
        this.holistic.setOptions(options);
        this.holistic.onResults(onResults);

        return this.holistic;
    }

    initCamera = () => {
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.holistic.send({ image: this.videoElement });
            },
            width: 640,
            height: 480
        });

        // camera.start();

        return this.camera;
    }

    initRenderer = ({ options }) => {
        this.renderer = new THREE.WebGLRenderer(options);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        document.body.appendChild(this.renderer.domElement);

        return this.renderer;
    }

    initOrbit = () => {
        this.orbitCamera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.orbitCamera.position.set(0.0, 1.4, 0.7);

        this.orbitControls = new THREE.OrbitControls(this.orbitCamera, this.renderer.domElement);
        this.orbitControls.screenSpacePanning = true;
        this.orbitControls.target.set(0.0, 1.4, 0.0);
        this.orbitControls.update();

        return {
            orbitCamera: this.orbitCamera,
            orbitControls: this.orbitControls
        }
    }

    initLight = () => {
        this.light = new THREE.DirectionalLight(0xffffff);
        this.light.position.set(1.0, 1.0, 1.0).normalize();

        this.scene.add(this.light);

        return this.light;
    }

    animateVRM = (vrm, results) => {
        if (!vrm) {
            return;
        }
        // Take the results from `Holistic` and animate character based on its Face, Pose, and Hand Keypoints.
        let riggedPose, riggedLeftHand, riggedRightHand, riggedFace;

        const faceLandmarks = results.faceLandmarks;
        // Pose 3D Landmarks are with respect to Hip distance in meters
        const pose3DLandmarks = results.ea;
        // Pose 2D landmarks are with respect to videoWidth and videoHeight
        const pose2DLandmarks = results.poseLandmarks;
        // Be careful, hand landmarks may be reversed
        const leftHandLandmarks = results.rightHandLandmarks;
        const rightHandLandmarks = results.leftHandLandmarks;

        // Animate Face
        if (faceLandmarks) {
            riggedFace = Kalidokit.Face.solve(faceLandmarks, {
                runtime: "mediapipe",
                video: this.videoElement
            });
            this.rigFace(riggedFace)
        }

        // Animate Pose
        if (pose2DLandmarks && pose3DLandmarks) {
            riggedPose = Kalidokit.Pose.solve(pose3DLandmarks, pose2DLandmarks, {
                runtime: "mediapipe",
                video: this.videoElement,
            });
            this.rigRotation("Hips", riggedPose.Hips.rotation, 0.7);
            this.rigPosition(
                "Hips",
                {
                    x: -riggedPose.Hips.position.x, // Reverse direction
                    y: riggedPose.Hips.position.y + 1, // Add a bit of height
                    z: -riggedPose.Hips.position.z // Reverse direction
                },
                1,
                0.07
            );

            this.rigRotation("Chest", riggedPose.Spine, 0.25, .3);
            this.rigRotation("Spine", riggedPose.Spine, 0.45, .3);

            this.rigRotation("RightUpperArm", riggedPose.RightUpperArm, 1, .3);
            this.rigRotation("RightLowerArm", riggedPose.RightLowerArm, 1, .3);
            this.rigRotation("LeftUpperArm", riggedPose.LeftUpperArm, 1, .3);
            this.rigRotation("LeftLowerArm", riggedPose.LeftLowerArm, 1, .3);

            this.rigRotation("LeftUpperLeg", riggedPose.LeftUpperLeg, 1, .3);
            this.rigRotation("LeftLowerLeg", riggedPose.LeftLowerLeg, 1, .3);
            this.rigRotation("RightUpperLeg", riggedPose.RightUpperLeg, 1, .3);
            this.rigRotation("RightLowerLeg", riggedPose.RightLowerLeg, 1, .3);
        }

        // Animate Hands
        if (leftHandLandmarks) {
            riggedLeftHand = Kalidokit.Hand.solve(leftHandLandmarks, "Left");
            this.rigRotation("LeftHand", {
                // Combine pose rotation Z and hand rotation X Y
                z: riggedPose.LeftHand.z,
                y: riggedLeftHand.LeftWrist.y,
                x: riggedLeftHand.LeftWrist.x
            });
            this.rigRotation("LeftRingProximal", riggedLeftHand.LeftRingProximal);
            this.rigRotation("LeftRingIntermediate", riggedLeftHand.LeftRingIntermediate);
            this.rigRotation("LeftRingDistal", riggedLeftHand.LeftRingDistal);
            this.rigRotation("LeftIndexProximal", riggedLeftHand.LeftIndexProximal);
            this.rigRotation("LeftIndexIntermediate", riggedLeftHand.LeftIndexIntermediate);
            this.rigRotation("LeftIndexDistal", riggedLeftHand.LeftIndexDistal);
            this.rigRotation("LeftMiddleProximal", riggedLeftHand.LeftMiddleProximal);
            this.rigRotation("LeftMiddleIntermediate", riggedLeftHand.LeftMiddleIntermediate);
            this.rigRotation("LeftMiddleDistal", riggedLeftHand.LeftMiddleDistal);
            this.rigRotation("LeftThumbProximal", riggedLeftHand.LeftThumbProximal);
            this.rigRotation("LeftThumbIntermediate", riggedLeftHand.LeftThumbIntermediate);
            this.rigRotation("LeftThumbDistal", riggedLeftHand.LeftThumbDistal);
            this.rigRotation("LeftLittleProximal", riggedLeftHand.LeftLittleProximal);
            this.rigRotation("LeftLittleIntermediate", riggedLeftHand.LeftLittleIntermediate);
            this.rigRotation("LeftLittleDistal", riggedLeftHand.LeftLittleDistal);
        }
        if (rightHandLandmarks) {
            riggedRightHand = Kalidokit.Hand.solve(rightHandLandmarks, "Right");
            this.rigRotation("RightHand", {
                // Combine Z axis from pose hand and X/Y axis from hand wrist rotation
                z: riggedPose.RightHand.z,
                y: riggedRightHand.RightWrist.y,
                x: riggedRightHand.RightWrist.x
            });
            this.rigRotation("RightRingProximal", riggedRightHand.RightRingProximal);
            this.rigRotation("RightRingIntermediate", riggedRightHand.RightRingIntermediate);
            this.rigRotation("RightRingDistal", riggedRightHand.RightRingDistal);
            this.rigRotation("RightIndexProximal", riggedRightHand.RightIndexProximal);
            this.rigRotation("RightIndexIntermediate", riggedRightHand.RightIndexIntermediate);
            this.rigRotation("RightIndexDistal", riggedRightHand.RightIndexDistal);
            this.rigRotation("RightMiddleProximal", riggedRightHand.RightMiddleProximal);
            this.rigRotation("RightMiddleIntermediate", riggedRightHand.RightMiddleIntermediate);
            this.rigRotation("RightMiddleDistal", riggedRightHand.RightMiddleDistal);
            this.rigRotation("RightThumbProximal", riggedRightHand.RightThumbProximal);
            this.rigRotation("RightThumbIntermediate", riggedRightHand.RightThumbIntermediate);
            this.rigRotation("RightThumbDistal", riggedRightHand.RightThumbDistal);
            this.rigRotation("RightLittleProximal", riggedRightHand.RightLittleProximal);
            this.rigRotation("RightLittleIntermediate", riggedRightHand.RightLittleIntermediate);
            this.rigRotation("RightLittleDistal", riggedRightHand.RightLittleDistal);
        }

    }

    rigRotation = (
        name,
        rotation = { x: 0, y: 0, z: 0 },
        dampener = 1,
        lerpAmount = 0.3
    ) => {
        if (!this.currentVrm) { return }
        const Part = this.currentVrm.humanoid.getBoneNode(
            THREE.VRMSchema.HumanoidBoneName[name]
        );
        if (!Part) { return }

        let euler = new THREE.Euler(
            rotation.x * dampener,
            rotation.y * dampener,
            rotation.z * dampener
        );
        let quaternion = new THREE.Quaternion().setFromEuler(euler);
        Part.quaternion.slerp(quaternion, lerpAmount);
    };

    rigPosition = (
        name,
        position = { x: 0, y: 0, z: 0 },
        dampener = 1,
        lerpAmount = 0.3
    ) => {
        if (!this.currentVrm) { return }
        const Part = this.currentVrm.humanoid.getBoneNode(
            THREE.VRMSchema.HumanoidBoneName[name]
        );
        if (!Part) { return }
        let vector = new THREE.Vector3(
            position.x * dampener,
            position.y * dampener,
            position.z * dampener
        );
        Part.position.lerp(vector, lerpAmount);
    };

    rigFace = (riggedFace) => {
        if (!this.currentVrm) { return }
        this.rigRotation("Neck", riggedFace.head, 0.7);

        // Blendshapes and Preset Name Schema
        const Blendshape = this.currentVrm.blendShapeProxy;
        const PresetName = THREE.VRMSchema.BlendShapePresetName;

        // Simple example without winking. Interpolate based on old blendshape, then stabilize blink with `Kalidokit` helper function.
        // for VRM, 1 is closed, 0 is open.

        riggedFace.eye.l = lerp(clamp(1 - riggedFace.eye.l, 0, 1), Blendshape.getValue(PresetName.Blink), .5);
        riggedFace.eye.r = lerp(clamp(1 - riggedFace.eye.r, 0, 1), Blendshape.getValue(PresetName.Blink), .5);
        riggedFace.eye = Kalidokit.Face.stabilizeBlink(riggedFace.eye, riggedFace.head.y);
        Blendshape.setValue(PresetName.Blink, riggedFace.eye.l);

        // Interpolate and set mouth blendshapes
        Blendshape.setValue(PresetName.I, lerp(riggedFace.mouth.shape.I, Blendshape.getValue(PresetName.I), .5));
        Blendshape.setValue(PresetName.A, lerp(riggedFace.mouth.shape.A, Blendshape.getValue(PresetName.A), .5));
        Blendshape.setValue(PresetName.E, lerp(riggedFace.mouth.shape.E, Blendshape.getValue(PresetName.E), .5));
        Blendshape.setValue(PresetName.O, lerp(riggedFace.mouth.shape.O, Blendshape.getValue(PresetName.O), .5));
        Blendshape.setValue(PresetName.U, lerp(riggedFace.mouth.shape.U, Blendshape.getValue(PresetName.U), .5));

        //PUPILS
        //interpolate pupil and keep a copy of the value
        let lookTarget =
            new THREE.Euler(
                lerp(this.oldLookTarget.x, riggedFace.pupil.y, .4),
                lerp(this.oldLookTarget.y, riggedFace.pupil.x, .4),
                0,
                "XYZ"
            );
        this.oldLookTarget.copy(lookTarget);
        this.currentVrm.lookAt.applyer.lookAt(lookTarget);
    }

    onResize = () => {
        this.orbitCamera.aspect = window.innerWidth / window.innerHeight;
        this.orbitCamera.updateProjectionMatrix();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate = () => {
        if (this.fastAnimate) this.requestAnimationFrameWithSleep()
        this.delta = this.clock.getDelta();
        if (this.currentVrm) {
            // Update model to render physics
            this.currentVrm.update(this.delta);

            this.FPSMaterial.map = new THREE.CanvasTexture(this.FPSCanVas); // 更新紋理
            this.FPSMaterial.map.needsUpdate = true;
        }
        this.renderer.render(this.scene, this.orbitCamera);

        if (!this.fastAnimate) this.requestAnimationFrameWithSleep()

    }

    requestAnimationFrameWithSleep = () => {
        if(this.delay) this.sleep(this.delay).then(() => this.animate());
        else requestAnimationFrame(this.animate);
    }

    startCamera = () => {
        this.camera.start();
    }

    sleep = (ms) => {
        return new Promise(res => {
            setTimeout(res, ms);
        });
    }
}

const app = new AppManager({
    Model: {
        path: modelPath
    },
    fastAnimate: false,
    delay: 50,
});