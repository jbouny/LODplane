function LODSelection() {
	this.nodes = new Array();
}

var LODTerrain = function( inSize, inHeight, inLevels, inLevelResolution ) {
	THREE.Object3D.call(this);

	this.size = (inSize !== undefined) ? inSize : 1;
	this.levels = (inLevels !== undefined) ? inLevels : 7;
	this.levelResolution = (inLevelResolution !== undefined) ? inLevelResolution : 10;

	this.root = new LODnode();
	this.root.create( - this.size * 0.5, - this.size * 0.5, this.size, this.levels );
	this.selection = new LODSelection();
}

LODTerrain.prototype.geometry = function geometry( inPosition ) {
	this.root.select( [ 1,2,4,8,16,32,64,128,256,512 ], 0, inPosition, this.selection );
	
	var geo = new THREE.Geometry();
	var nbVertices = 0;
	for( var node in this.selection.nodes ) {
		var lodNode = this.selection.nodes[node];
		//console.log( lodNode );
		var size = lodNode.size / this.levelResolution ;
		for( var i = 0; i < this.levelResolution; ++i ) {
		
			var y = lodNode.y + size * i;
			
			for( var j = 0; j < this.levelResolution; ++j ) {
			
				var x = lodNode.x + size * j;
		
				geo.vertices.push( new THREE.Vector3( x, y, 0 ) );
				geo.vertices.push( new THREE.Vector3( x + size, y, 0 ) );
				geo.vertices.push( new THREE.Vector3( x + size, y + size, 0 ) );
				geo.vertices.push( new THREE.Vector3( x, y + size, 0 ) );
				
				geo.faces.push( new THREE.Face3( nbVertices, nbVertices + 1, nbVertices + 2 ) );
				geo.faces.push( new THREE.Face3( nbVertices + 2, nbVertices + 3, nbVertices ) );
						
				nbVertices += 4;
				
			}
		}
	}
	
	//this.geometry.computeFaceNormals();
	//this.geometry.computeVertexNormals();
	
	return geo;
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
	
	initialize: function initialize(inIdCanvas) {
		this.ms_Canvas = $('#'+inIdCanvas);
		
		// Initialize Renderer, Camera and Scene
		this.ms_Renderer = this.enable? new THREE.WebGLRenderer() : new THREE.CanvasRenderer();
		this.ms_Canvas.html(this.ms_Renderer.domElement);
		this.ms_Scene = new THREE.Scene();
		
		this.ms_Camera = new THREE.PerspectiveCamera(55.0, WINDOW.ms_Width / WINDOW.ms_Height, 0.5, 3000000);
		this.ms_Camera.position.set(100, 50, -150);
		this.ms_Camera.lookAt(new THREE.Vector3(0, 0, 0));
		
		// Initialize Orbit control		
		this.ms_Controls = new THREE.OrbitControls( this.ms_Camera );
		//this.ms_Controls = new THREE.OrbitControls(this.ms_Camera, this.ms_Renderer.domElement);
	
		// Add light
		var directionalLight = new THREE.DirectionalLight(0xffff55, 1);
		directionalLight.position.set(-600, 300, 600);
		this.ms_Scene.add(directionalLight);
		
		// Create LOD terrain
		
		this.ms_LODTerrain = new LODTerrain( 50 );
		
		this.ms_Material = new THREE.MeshBasicMaterial( {color: 0xffffff, wireframe: true, side: THREE.DoubleSide} );
		this.ms_Plane = new THREE.Mesh( this.ms_LODTerrain.geometry( new THREE.Vector3( 0, 0, 0 ) ), this.ms_Material );
		this.ms_Scene.add( this.ms_Plane );
	},

    display: function display() {
		this.ms_Renderer.render(this.ms_Scene, this.ms_Camera);
	},
	
	update: function update() {
		//this.ms_Scene.remove( this.ms_Plane );
		//this.ms_Plane = new THREE.Mesh( this.ms_LODTerrain.geometry( this.ms_Camera.position ), this.ms_Material );
		//this.ms_Scene.add( this.ms_Plane );
		
		this.display();
	},
	
	resize: function resize(inWidth, inHeight) {
		this.ms_Camera.aspect =  inWidth / inHeight;
		this.ms_Camera.updateProjectionMatrix();
		this.ms_Renderer.setSize(inWidth, inHeight);
		this.ms_Canvas.html(this.ms_Renderer.domElement);
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