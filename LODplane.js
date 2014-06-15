var LOD = {};

LOD.Node = function Node() {
}

LOD.Node.prototype.create = function create( inX, inY, inSize, inLevel ) {
	this.x = inX;
	this.y = inY;
	this.centerX = inX + inSize * 0.5;
	this.centerY = inY + inSize * 0.5;
	this.size = inSize;
	this.level = inLevel;
	this.height = 0;
	this.childs = [];
	
	var nbNodes = 0;
	
	if( 0 === inLevel ) {
		// If we are a leaf, stop the creation process
		nbNodes = 1;
	}
	else {
		// Else, create childs
		var childSize = inSize * 0.5;
		
		for( var i = 0; i < 2; ++i ) {
			for( var j = 0; j < 2; ++j ) {
				var child = new LOD.Node();
				
				nbNodes += child.create( inX + childSize * j, inY + childSize * i, childSize, inLevel - 1 );

				this.childs[j * 2 + i] = child;
			}			
		}
	}
	
	return nbNodes;
}

LOD.Node.prototype.intersectsSphere = function intersectsSphere( inRange, inPosition ) {
	var xp = this.centerX;
	var yp = this.height;
	var zp = this.centerY;
	
	var distance = Math.sqrt( 
		(inPosition.x - xp) * (inPosition.x - xp) +
		(inPosition.z - yp) * (inPosition.z - yp) +
		(inPosition.y - zp) * (inPosition.y - zp) 
	);
	
	return ( distance - this.size * 0.5 ) < inRange;
}

LOD.Node.prototype.frustumIntersect = function frustumIntersect( inFrustum ) {
	return true ;
}

LOD.Node.prototype.select = function select( inRanges, inFrustum, inPosition, outSelection ) {

	if( !this.intersectsSphere( inRanges[ this.level ], inPosition ) ) {
		if( outSelection.nbLevels === this.level ) {
			// If we are the root, handle even if we are away
			outSelection.add( this.x, this.y, this.size, this.level, 0 );
			return true;
		}
		else {
			// No node or child nodes were selected; return false so that our parent node handles our area
			return false;
		}
	}
	
	if( !this.frustumIntersect( inFrustum ) ) {
		/* We are out of frustum, select nothing but return true to mark this node as having been 
		   correctly handled so that our parent node does not select itself over our area */
		//console.log("frustumIntersect");
		return true; 
	}
	
	if( 0 === this.level ) {
		// We are in our LOD range and we are the last LOD level 
		outSelection.add( this.x, this.y, this.size, this.level, 0 );
	}
	else {
		/* We are in range of our LOD level and we are not the last level: if we are also in range 
		   of a more detailed LOD level, then some of our child nodes will need to be selected 
		   instead in order to display a more detailed mesh. */
		if( !this.intersectsSphere( inRanges[this.level-1], inPosition ) ) {
			// We cover the required lodLevel range
			outSelection.add( this.x, this.y, this.size, this.level, 0 );
		}
		else {
			/* We cover the more detailed lodLevel range: some or all of our four child nodes will 
			   have to be selected instead */
			for( var key in this.childs ) {
				var childNode = this.childs[key];
				
				if( !childNode.select( inRanges, inFrustum, inPosition, outSelection ) ) {
					outSelection.add( childNode.x, childNode.y, this.size, this.level, 1 );
				}
			}
		}
	}
	return true;
};

LOD.Selection = function Selection( inNbNodes, inNbLevels ) {
	this.posX = new Float32Array( inNbNodes  );
	this.posY = new Float32Array( inNbNodes );
	this.size = new Float32Array( inNbNodes );
	this.partition = new Int8Array( inNbNodes ) ;
	this.level = new Int8Array( inNbNodes ) ;
	this.nbElements = 0;
	this.nbLevels = inNbLevels;
}

LOD.Selection.prototype.clear = function clear() {
	this.nbElements = 0;
}

LOD.Selection.prototype.add = function add( inX, inY, inSize, inLevel, inPartition ) {
	var area = [];
	this.posX[this.nbElements] = inX;
	this.posY[this.nbElements] = inY;
	this.size[this.nbElements] = inSize;
	this.partition[this.nbElements] = inPartition;
	this.level[this.nbElements] = inLevel;
	
	this.nbElements ++;
}

LOD.Plane = function Plane( inSize, inLevels, inLevelResolution ) {
	THREE.Object3D.call(this);

	this.size = (inSize !== undefined) ? inSize : 1;
	this.levels = (inLevels !== undefined) ? inLevels : 7;
	this.levelResolution = (inLevelResolution !== undefined) ? inLevelResolution : 10;

	this.root = new LOD.Node();
	var nbNodes = this.root.create( - this.size * 0.5, - this.size * 0.5, this.size, this.levels - 1 );
	this.selection = new LOD.Selection( nbNodes, inLevels - 1 );
	
	// Generate ranges
	this.ranges = [];
	var range = 1;
	for( var i = 0; i < inLevels; ++i ) {
		this.ranges[i] = range;
		range *= 2;
	}
	
	// Generate tiles colors
	this.tilesColors = [];
	this.tilesColorsDark = [];
	var startColor = new THREE.Color( 0xff00ff );
	var endColor = new THREE.Color( 0x0000ff );
	for( var i = 0; i < this.levels; ++i ) {
		var distance = i / ( this.levels - 1 );
		var color = new THREE.Color(
			startColor.r + ( endColor.r - startColor.r ) * distance,
			startColor.g + ( endColor.g - startColor.g ) * distance,
			startColor.b + ( endColor.b - startColor.b ) * distance
		);
		this.tilesColors[i] = color;
		this.tilesColorsDark[i] = new THREE.Color( color.r * 0.3, color.g * 0.3, color.b * 0.3 );
	}
}

LOD.Plane.prototype.geometry = function geometry( inPosition ) {
	this.root.select( this.ranges, 0, inPosition, this.selection );
	
	
	var geo = new THREE.BufferGeometry();
	
	var nbNodes = this.selection.nbElements;
	var triangles = nbNodes * 2 * this.levelResolution * this.levelResolution ;
	geo.addAttribute( 'index', new THREE.Uint16Attribute( triangles * 3, 1 ) );
	geo.addAttribute( 'color', new THREE.Float32Attribute( triangles * 3 * 3, 3 ) );
	geo.addAttribute( 'position', new THREE.Float32Attribute( triangles * 3 * 3, 3 ) );
	
	var colors = geo.getAttribute( 'color' ).array;
	var positions = geo.getAttribute( 'position' ).array;
	var indices = geo.getAttribute( 'index' ).array;
	var indexPosition = 0;
	var indexIndices = 0;
	var nbVertices = 0;
	
	for( var node = 0; node < nbNodes; node++ ) {
		var nodePartition = this.selection.partition[node];
		var nodeSize = this.selection.size[node];
		var nodeX = this.selection.posX[node];
		var nodeY = this.selection.posY[node];
		var nodeLevel = this.selection.level[node];
		var nbTiles = ( 1 === nodePartition ) ? ( this.levelResolution  / 2 ) : this.levelResolution; // Check if this is just a demi area
		var size = nodeSize / this.levelResolution ;
		
		for( var i = 0; i < nbTiles; ++i ) {
		
			var y = nodeY + size * i;
			
			for( var j = 0; j < nbTiles; ++j ) {
				var p = indexPosition;
				var id = indexIndices;
				var x = nodeX + size * j;
				
				positions[p] = x;
				positions[p+1] = y;
				positions[p+2] = 0;
				
				positions[p+3] = x + size;
				positions[p+4] = y;
				positions[p+5] = 0;
				
				positions[p+6] = x + size;
				positions[p+7] = y + size;
				positions[p+8] = 0;
				
				positions[p+9] = x;
				positions[p+10] = y + size;
				positions[p+11] = 0;
				
				indices[id] = nbVertices;
				indices[id+1] = nbVertices + 1;
				indices[id+2] = nbVertices + 2;
				
				indices[id+3] = nbVertices + 2;
				indices[id+4] = nbVertices + 3;
				indices[id+5] = nbVertices;
				
				var color = ( ( i % 2 + j % 2 ) == 1 ) ? this.tilesColors[nodeLevel] : this.tilesColorsDark[nodeLevel] ;
				for( var pos = 0; pos < 4; pos++ ) {
					colors[p + pos * 3] = color.r;
					colors[p + pos * 3 + 1] = color.g;
					colors[p + pos * 3 + 2] = color.b;
				}
						
				nbVertices += 4;
				indexIndices += 6;
				indexPosition += 12;
				
			}
		}
	}
	
	this.selection.clear();
	
	//this.geometry.computeFaceNormals();
	//this.geometry.computeVertexNormals();
	
	return geo;
};