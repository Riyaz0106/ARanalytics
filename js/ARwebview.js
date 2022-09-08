var World = {
	loaded: false,
	rotating: false,
	trackableVisible: false,
	snapped: false,
	resourcesLoaded: false,
	interactionContainer: 'snapContainer',
	layout: {
		normal: {
			offsetX: 0.35,
			offsetY: 0.45,
			opacity: 0.0,
			laysScale: 0.045,
			laysTranslateY: 0.05
		},
		snapped: {
			offsetX: 0.45,
			offsetY: 0.45,
			opacity: 0.2,
			laysScale: 0.08,
			laysTranslateY: 0
		}
	},
	previousDragValue: { x: 0, y: 0 },
	previousScaleValue: 0,
	previousScaleValueButtons: 0,
	previousRotationValue: 0,
	previousTranslateValueRotate: { x: 0, y: 0 },
	previousTranslateValueSnap: { x: 0, y: 0 },
	defaultScale: 0,

	init: function initFn() {
		this.createOverlays();
	},

	createOverlays: function createOverlaysFn() {
		/*
			First an AR.ImageTracker needs to be created in order to start the recognition engine. It is initialized with a AR.TargetCollectionResource specific to the target collection that should be used. Optional parameters are passed as object in the last argument. In this case a callback function for the onTargetsLoaded trigger is set. Once the tracker loaded all its target images, the function worldLoaded() is called.
		*/
		this.targetCollectionResource = new AR.TargetCollectionResource("assets/tracker.wtc", {
			onLoaded: function () {
				World.resourcesLoaded = true;
				this.loadingStep;
			},
            onError: function(errorMessage) {
            	alert(errorMessage);
            }
		});

		this.tracker = new AR.ImageTracker(this.targetCollectionResource, {
			onTargetsLoaded: this.loadingStep,
            onError: function(errorMessage) {
            	alert(errorMessage);
            }
		});
		
		/*
			The button is created similar to the overlay feature. An AR.ImageResource defines the look of the button and is reused for both buttons.
		*/
		this.imgButton = new AR.ImageResource("assets/wwwButton.jpg");
		/*
			For each target an AR.ImageDrawable for the button is created by utilizing the helper function createWwwButton(url, options). The returned drawable is then added to the drawables.cam array on creation of the AR.ImageTrackable.
		*/
		var pageOneButton = this.createWwwButton("https://www.blue-tomato.com/en-US/products/?q=sup", 0.1, {
			scale: {
				x: 1,
				y: 1
			},
			translate: {
				x: -0.25,
				y: 0.25
			},
			zOrder: 1
		});
		
		/*
			3D content Loading
		*/
		World.modellays = new AR.Model("assets/lays.wt3", {
			onLoaded: this.loadingStep,
			scale: {
				x: 0.0,
				y: 0.0,
				z: 0.0
			},
			translate: {
				x: 0.0,
				y: 0.05,
				z: 0.0
			},
			rotate: {
				z: 335
			},
			onScaleBegan: World.onScaleBegan,
            onScaleChanged: World.onScaleChanged,
            onScaleEnded: function(scale) {
            },
            onDragBegan: function(x, y) {
			},
			onDragChanged: function(x, y) {
				if (World.snapped) {
					var movement = { x:0, y:0 };

					/* Calculate the touch movement between this event and the last one */
					movement.x = World.previousDragValue.x - x;
					movement.y = World.previousDragValue.y - y;

					/* Rotate the lays model accordingly to the calculated movement values and the current orientation of the model. */
					this.rotate.y += (Math.cos(this.rotate.z * Math.PI / 180) * movement.x * -1 + Math.sin(this.rotate.z * Math.PI / 180) * movement.y) * 180;
					this.rotate.x += (Math.cos(this.rotate.z * Math.PI / 180) * movement.y + Math.sin(this.rotate.z * Math.PI / 180) * movement.x) * -180;

					World.previousDragValue.x = x;
					World.previousDragValue.y = y;
				}
			},
			onDragEnded: function(x, y) {
				if (World.snapped) {
					World.previousDragValue.x = 0;
					World.previousDragValue.y = 0;
				}
			},
			onRotationBegan: function(angleInDegrees) {
            },
            onRotationChanged: function(angleInDegrees) {
               this.rotate.z = previousRotationValue - angleInDegrees;
            },
            onRotationEnded: function(angleInDegrees) {
               previousRotationValue = this.rotate.z
            }
		});

		/*
			As a next step, an appearing animation is created. For more information have a closer look at the function implementation.
		*/
		this.appearingAnimation = this.createAppearingAnimation(World.modellays, 0.045);

		/*
			The rotation animation for the 3D model is created by defining an AR.PropertyAnimation for the rotate.roll property.
		*/
		this.rotationAnimation = new AR.PropertyAnimation(World.modellays, "rotate.z", -25, 335, 10000);
		/*
			Additionally to the 3D model an image that will act as a button is added to the image target. This can be accomplished by loading an AR.ImageResource and creating a drawable from it.
		*/
		var imgRotate = new AR.ImageResource("assets/rotateButton.png");
		World.buttonRotate = new AR.ImageDrawable(imgRotate, 0.2, {
			translate: {
				x: 0.35,
				y: 0.45
			},
			onClick: this.toggleAnimateModel
		});

		var imgSnap = new AR.ImageResource("assets/snapButton.png");
		World.buttonSnap = new AR.ImageDrawable(imgSnap, 0.2, {
			translate: {
				x: -0.35,
				y: -0.45
			},
			onClick: this.toggleSnapping
		});

		/*
			To receive a notification once the image target is inside the field of vision the onImageRecognized trigger of the AR.ImageTrackable is used. In the example the function appear() is attached. Within the appear function the previously created AR.AnimationGroup is started by calling its start() function which plays the animation once.

			To add the AR.ImageDrawable to the image target together with the 3D model both drawables are supplied to the AR.ImageTrackable.
		*/
		this.trackable = new AR.ImageTrackable(this.tracker, "303", {
			drawables: {
				cam: [World.modellays, World.buttonRotate, World.buttonSnap, pageOneButton]
			},
			snapToScreen: {
				snapContainer: document.getElementById('snapContainer')
			},
			onImageRecognized: this.appear,
			onImageLost: this.disappear,
            onError: function(errorMessage) {
            	alert(errorMessage);
            }
		});
	},
	
	createWwwButton: function createWwwButtonFn(url, size, options) {
		/*
			As the button should be clickable the onClick trigger is defined in the options passed to the AR.ImageDrawable. In general each drawable can be made clickable by defining its onClick trigger. The function assigned to the click trigger calls AR.context.openInBrowser with the specified URL, which opens the URL in the browser.
		*/
		options.onClick = function() {
			AR.context.openInBrowser(url);
		};
		return new AR.ImageDrawable(this.imgButton, size, options);
	},

	removeLoadingBar: function() {
		if (!World.loaded && World.resourcesLoaded && World.modellays.isLoaded()) {
			var e = document.getElementById('loadingMessage');
			e.parentElement.removeChild(e);
			World.loaded = true;
		}
	},

	loadingStep: function loadingStepFn() {
		if (World.resourcesLoaded && World.modellays.isLoaded()) {
			
			if ( World.trackableVisible && !World.appearingAnimation.isRunning() ) {
				World.appearingAnimation.start();
			}
						
			var cssDivLeft = " style='display: table-cell;vertical-align: middle; text-align: right; width: 50%; padding-right: 15px;'";
			var cssDivRight = " style='display: table-cell;vertical-align: middle; text-align: left;'";
			document.getElementById('loadingMessage').innerHTML =
				"<div" + cssDivLeft + ">Scan Lays Image:</div>" +
				"<div" + cssDivRight + "><img src='assets/lays.jpg'></img></div>";
		}
	},

	createAppearingAnimation: function createAppearingAnimationFn(model, scale) {
		/*
			The animation scales up the 3D model once the target is inside the field of vision. Creating an animation on a single property of an object is done using an AR.PropertyAnimation. Since the lays model needs to be scaled up on all three axis, three animations are needed. These animations are grouped together utilizing an AR.AnimationGroup that allows them to play them in parallel.

			Each AR.PropertyAnimation targets one of the three axis and scales the model from 0 to the value passed in the scale variable. An easing curve is used to create a more dynamic effect of the animation.
		*/
		var sx = new AR.PropertyAnimation(model, "scale.x", 0, scale, 1500, {
			type: AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC
		});
		var sy = new AR.PropertyAnimation(model, "scale.y", 0, scale, 1500, {
			type: AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC
		});
		var sz = new AR.PropertyAnimation(model, "scale.z", 0, scale, 1500, {
			type: AR.CONST.EASING_CURVE_TYPE.EASE_OUT_ELASTIC
		});

		return new AR.AnimationGroup(AR.CONST.ANIMATION_GROUP_TYPE.PARALLEL, [sx, sy, sz]);
	},

	appear: function appearFn() {
		World.removeLoadingBar();
		World.trackableVisible = true;
		if ( World.loaded && !World.snapped ) {
			// Resets the properties to the initial values.
			World.resetModel();
			World.appearingAnimation.start();		
		}
	},
	disappear: function disappearFn() {
		World.trackableVisible = false;
	},

	resetModel: function resetModelFn() {
		World.rotationAnimation.stop();
		World.rotating = false;
		World.modellays.rotate.x = 0;
		World.modellays.rotate.y = 0;
		World.modellays.rotate.z = 335;
	},

	toggleAnimateModel: function toggleAnimateModelFn() {
		if (!World.rotationAnimation.isRunning()) {
			if (!World.rotating) {
				// Starting an animation with .start(-1) will loop it indefinitely.
				World.rotationAnimation.start(-1);
				World.rotating = true;
			} else {
				// Resumes the rotation animation
				World.rotationAnimation.resume();
			}
		} else {
			// Pauses the rotation animation
			World.rotationAnimation.pause();
		}

		return false;
	},

	/*
		This function is used to either snap the trackable onto the screen or to detach it. World.trackable.snapToScreen.enabled is therefore used. Depending on the snap state a new layout for the position and size of certain drawables is set. To allow rotation and scale changes only in the snapped state, event handler are added or removed based on the new snap state.
	*/
	toggleSnapping: function toggleSnappingFn() {

		if (World.appearingAnimation.isRunning()) {
			World.appearingAnimation.stop();	
		}
		World.snapped = !World.snapped;
		World.trackable.snapToScreen.enabled = World.snapped;

		if (World.snapped) {
			World.applyLayout(World.layout.snapped);

		} else {
			World.applyLayout(World.layout.normal);
		}
	},

	/*
		applyLayout is used to define position and scale of certain drawables in the scene for certain states. The different layouts are defined at the top of the World object.
	*/
	applyLayout: function applyLayoutFn(layout) {

		World.buttonRotate.translate.x = layout.offsetX;
		World.buttonRotate.translate.y = layout.offsetY;

		World.buttonSnap.translate.x = -layout.offsetX;
		World.buttonSnap.translate.y = -layout.offsetY;

		World.buttonRotate.scale.x =  1;
		World.buttonRotate.scale.y =  1;
		World.buttonSnap.scale.x =  1;
		World.buttonSnap.scale.y =  1;

		World.modellays.scale = {
			x: layout.laysScale,
			y: layout.laysScale,
			z: layout.laysScale
		};

		World.defaultScale = layout.laysScale;

		World.modellays.translate = {
			x: 0.0,
			y: layout.laysTranslateY,
			z: 0.0
		};
	},
	onScaleBegan: function(scale) {
		if (World.snapped) {
			World.previousScaleValue = World.modellays.scale.x;
			World.previousScaleValueButtons = World.buttonRotate.scale.x;

			World.previousTranslateValueRotate.x = World.buttonRotate.translate.x;
			World.previousTranslateValueRotate.y = World.buttonRotate.translate.x;

			World.previousTranslateValueSnap.x = World.buttonSnap.translate.x;
			World.previousTranslateValueSnap.y = World.buttonSnap.translate.x;
		}
    },
    onScaleChanged: function(scale) {
    	if (World.snapped) {
           World.modellays.scale.x = World.previousScaleValue * scale;
           World.modellays.scale.y = World.modellays.scale.x;
           World.modellays.scale.z = World.modellays.scale.x;

           World.buttonRotate.scale.x =  World.previousScaleValueButtons * scale;
           World.buttonRotate.scale.y =  World.buttonRotate.scale.x;

           World.buttonSnap.scale.x =  World.buttonRotate.scale.x;
           World.buttonSnap.scale.y =  World.buttonRotate.scale.x;

           World.buttonRotate.translate.x = World.previousTranslateValueRotate.x * scale;
           World.buttonRotate.translate.y = World.previousTranslateValueRotate.y * scale;

           World.buttonSnap.translate.x = World.previousTranslateValueSnap.x * scale;
           World.buttonSnap.translate.y = World.previousTranslateValueSnap.y * scale;
   		}
    },
};

World.init();
