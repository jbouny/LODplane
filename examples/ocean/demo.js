THREE.ShaderLib['water'] = {

	uniforms: { "normalSampler":	{ type: "t", value: null },
				"mirrorSampler":	{ type: "t", value: null },
				"alpha":			{ type: "f", value: 1.0 },
				"time":				{ type: "f", value: 0.0 },
				"distortionScale":	{ type: "f", value: 20.0 },
				"noiseScale":		{ type: "f", value: 1.0 },
				"textureMatrix" :	{ type: "m4", value: new THREE.Matrix4() },
				"sunColor":			{ type: "c", value: new THREE.Color(0x7F7F7F) },
				"sunDirection":		{ type: "v3", value: new THREE.Vector3(0.70707, 0.70707, 0) },
				"eye":				{ type: "v3", value: new THREE.Vector3(0, 0, 0) },
				"waterColor":		{ type: "c", value: new THREE.Color(0x555555) },
				"betaVersion":		{ type: "i", value: 0 }
	},

	vertexShader: [
		'uniform mat4 textureMatrix;',
		'uniform float time;',
		'uniform float noiseScale;',
		'uniform sampler2D normalSampler;',
		'uniform int betaVersion;',

		'varying vec4 mirrorCoord;',
		'varying vec3 worldPosition;',
		
		'float getHeight(in vec2 uv)',
		'{',
		'	vec2 uv0 = uv / (1003.0 * noiseScale) + vec2(time / 170.0, time / 290.0);',
		
		'	float v0 = 1.0 - texture2D(normalSampler, uv0).y;',
		
		'	return v0 * 4000.0;',
		'}',
		
		'void main()',
		'{',
		'	mirrorCoord = modelMatrix * vec4(position, 1.0);',
		'	worldPosition = mirrorCoord.xyz;',
		
		'	mirrorCoord = textureMatrix * mirrorCoord;',
		'	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
		
		'	if(betaVersion > 0)', // This is just a really beta way to add movement on vertices, totally wrong, but fast to implement
		'	{',
		'		gl_Position.y += getHeight(worldPosition.xz) * 0.008;',
		'	}',
		'}'
	].join('\n'),

	fragmentShader: [		
		'uniform sampler2D mirrorSampler;',
		'uniform float alpha;',
		'uniform float time;',
		'uniform float distortionScale;',
		'uniform float noiseScale;',
		'uniform sampler2D normalSampler;',
		'uniform vec3 sunColor;',
		'uniform vec3 sunDirection;',
		'uniform vec3 eye;',
		'uniform vec3 waterColor;',

		'varying vec4 mirrorCoord;',
		'varying vec3 worldPosition;',
		
		'void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, in float shiny, in float spec, in float diffuse, inout vec3 diffuseColor, inout vec3 specularColor)',
		'{',
		'	vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));',
		'	float direction = max(0.0, dot(eyeDirection, reflection));',
		'	specularColor += pow(direction, shiny) * sunColor * spec;',
		'	diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * diffuse;',
		'}',
		
		'vec3 getNoise(in vec2 uv)',
		'{',
		'	vec2 uv0 = uv / (1003.0 * noiseScale) + vec2(time / 170.0, time / 290.0);',
		'	vec2 uv1 = uv / (107.0 * noiseScale) - vec2(time / -19.0, time / 31.0);',
		'	vec4 noise = (texture2D(normalSampler, uv0)) +',
        '		( (texture2D(normalSampler, uv1)) - 0.5 );',
		'	return noise.xzy;',
		'}',
		
		'void main()',
		'{',
		'	vec3 surfaceNormal = (getNoise(worldPosition.xz));',
		'   if( eye.y < worldPosition.y )',
		'		surfaceNormal = surfaceNormal * -1.0;',

		'	vec3 diffuseLight = vec3(0.0);',
		'	vec3 specularLight = vec3(0.0);',

		'	vec3 worldToEye = eye - worldPosition;',
		'	vec3 eyeDirection = normalize(worldToEye);',
		'	sunLight(surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight);',
		
		'	float distance = length(worldToEye);',

		'	vec2 distortion = surfaceNormal.xz * distortionScale * sqrt(distance) * 0.07;',
        '   vec3 mirrorDistord = mirrorCoord.xyz + vec3(distortion.x, distortion.y, 1.0);',
        '   vec3 reflectionSample = texture2DProj(mirrorSampler, mirrorDistord).xyz;',

		'	float theta = max(dot(eyeDirection, surfaceNormal), 0.0);',
		'	const float rf0 = 0.3;',
		'	float reflectance = 0.3 + (1.0 - 0.3) * pow((1.0 - theta), 5.0);',
		'	vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;',
		'	vec3 albedo = mix(sunColor * diffuseLight * 0.3 + scatter, (vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight), reflectance);',
        '   vec2 tmp = mirrorCoord.xy / mirrorCoord.z + distortion;',

        '	gl_FragColor = vec4(albedo, alpha);',
		'}'
	].join('\n')

};

var WINDOW = {
	ms_Width: 0,
	ms_Height: 0,
	ms_Callbacks: {
		70: "WINDOW.toggleFullScreen()"		// Toggle fullscreen
	},
	
	initialize: function initialize() {
		this.updateSize();
		
		// Create callbacks from keyboard
		$(document).keydown(function(inEvent) { WINDOW.callAction(inEvent.keyCode); }) ;
		$(window).resize(function(inEvent) {
			WINDOW.updateSize();
			WINDOW.resizeCallback(WINDOW.ms_Width, WINDOW.ms_Height);
		});
	},
	updateSize: function updateSize() {
		this.ms_Width = $(window).width();
		this.ms_Height = $(window).height() - 4;
	},
	callAction: function callAction(inId) {
		if(inId in this.ms_Callbacks) {
			eval(this.ms_Callbacks[inId]);
			return false ;
		}
	},
	toggleFullScreen: function toggleFullScreen() {
		if(!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement) {
			if(document.documentElement.requestFullscreen)
				document.documentElement.requestFullscreen();
			else if(document.documentElement.mozRequestFullScreen)
				document.documentElement.mozRequestFullScreen();
			else if(document.documentElement.webkitRequestFullscreen)
				document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		} 
		else  {
			if(document.cancelFullScreen)
				document.cancelFullScreen();
			else if(document.mozCancelFullScreen)
				document.mozCancelFullScreen();
			else if (document.webkitCancelFullScreen)
				document.webkitCancelFullScreen();
		}
	},	
	resizeCallback: function resizeCallback(inWidth, inHeight) {}
};

var DEMO = {
	ms_Canvas: null,
	ms_Renderer: null,
	ms_Camera: null, 
	ms_Scene: null, 
	ms_Controls: null,
	ms_Water: null,

    enable: (function enable() {
        try {
            var aCanvas = document.createElement('canvas');
            return !! window.WebGLRenderingContext && (aCanvas.getContext('webgl') || aCanvas.getContext('experimental-webgl'));
        }
        catch(e) {
            return false;
        }
    })(),
	
	initialize: function initialize( inIdCanvas ) {
		this.ms_Canvas = $( '#' + inIdCanvas );
		
		// Initialize Renderer, Camera and Scene
		this.ms_Renderer = this.enable? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
		this.ms_Canvas.html( this.ms_Renderer.domElement );
		this.ms_Scene = new THREE.Scene();
		
		this.ms_Camera = new THREE.PerspectiveCamera( 55.0, WINDOW.ms_Width / WINDOW.ms_Height, 0.001, 3000000 );
		this.ms_Camera.position.set( 0, 50, -200 );
		this.ms_Camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		
		// Initialize Orbit control		
		this.ms_Controls = new THREE.OrbitControls( this.ms_Camera );
		this.ms_Controls.addEventListener( 'change', this.lodUpdate );
	
		// Add light
		var directionalLight = new THREE.DirectionalLight(0xffff55, 1);
		directionalLight.position.set( -130, 180, 400 );
		this.ms_Scene.add(directionalLight);
		
		// Create the water effect
		var waterNormals = new THREE.ImageUtils.loadTexture('img/waternormals.jpg');
		waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping; 
		
		this.ms_Water = new THREE.Water(this.ms_Renderer, this.ms_Camera, this.ms_Scene, {
			textureWidth: 256,
			textureHeight: 256,
			waterNormals: waterNormals,
			alpha: 	1.0,
			sunDirection: directionalLight.position.normalize(),
			sunColor: 0xffffff,
			waterColor: 0x00000f,
			betaVersion: 1
		});
		
		// Create LOD terrain
		this.ms_LODTerrain = new LOD.Plane( 200, 6, 32 );
		//this.ms_Material = new THREE.MeshBasicMaterial( {vertexColors: THREE.VertexColors, wireframe: true, side: THREE.DoubleSide} );

		/*this.ms_Material = new THREE.RawShaderMaterial( {

			uniforms: {
				time: { type: "f", value: 1.0 }
			},
			vertexShader: document.getElementById( 'vertexShader' ).textContent,
			fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
			side: THREE.DoubleSide,
			transparent: true

		} );*/
		
		this.ms_Plane = new THREE.Mesh( this.ms_LODTerrain.geometry( this.ms_Camera.position ), this.ms_Water.material );
		this.ms_Scene.add( this.ms_Plane );
		this.ms_Plane.rotation.x = - Math.PI * 0.5;
		this.ms_Plane.add(this.ms_Water);
	
		this.loadSkyBox();
		
		this.lodUpdate();
		
	},
	
	loadSkyBox: function loadSkyBox() {
		var aCubeMap = THREE.ImageUtils.loadTextureCube([
		  'img/grimmnight_west.jpg',
		  'img/grimmnight_east.jpg',
		  'img/grimmnight_up.jpg',
		  'img/grimmnight_down.jpg',
		  'img/grimmnight_south.jpg',
		  'img/grimmnight_north.jpg',
		]);
		aCubeMap.format = THREE.RGBFormat;

		var aShader = THREE.ShaderLib['cube'];
		aShader.uniforms['tCube'].value = aCubeMap;

		var aSkyBoxMaterial = new THREE.ShaderMaterial({
		  fragmentShader: aShader.fragmentShader,
		  vertexShader: aShader.vertexShader,
		  uniforms: aShader.uniforms,
		  depthWrite: false,
		  side: THREE.BackSide
		});

		var aSkybox = new THREE.Mesh(
		  new THREE.BoxGeometry(1000000, 1000000, 1000000),
		  aSkyBoxMaterial
		);
		
		this.ms_Scene.add(aSkybox);
	},

    display: function display() {
		this.ms_Water.render();
		this.ms_Renderer.render( this.ms_Scene, this.ms_Camera );
	},
	
	lodUpdate: function lodUpdate() {
		var geometry = DEMO.ms_LODTerrain.geometry( DEMO.ms_Camera.position );
		if( geometry !== DEMO.ms_Plane.geometry ) {
			DEMO.ms_Scene.remove( DEMO.ms_Plane );
			DEMO.ms_Plane = new THREE.Mesh( DEMO.ms_LODTerrain.geometry( DEMO.ms_Camera.position ), DEMO.ms_Water.material );
			DEMO.ms_Scene.add( DEMO.ms_Plane );
		}
	},
	
	update: function update() {
		var time = performance.now();
		this.ms_Water.material.uniforms.time.value = time / 1000;
		//this.ms_Material.uniforms.time.value = time * 0.005 ;
		
		this.display();
	},
	
	resize: function resize( inWidth, inHeight ) {
		this.ms_Camera.aspect =  inWidth / inHeight;
		this.ms_Camera.updateProjectionMatrix();
		this.ms_Renderer.setSize( inWidth, inHeight );
		this.ms_Canvas.html( this.ms_Renderer.domElement );
		this.display();
	}
};

function mainLoop() {
    requestAnimationFrame(mainLoop);
    DEMO.update();
}

$(function() {
	WINDOW.initialize();
	
	DEMO.initialize('canvas-3d');
	
	WINDOW.resizeCallback = function(inWidth, inHeight) { DEMO.resize(inWidth, inHeight); };
	DEMO.resize(WINDOW.ms_Width, WINDOW.ms_Height);

    mainLoop();
});