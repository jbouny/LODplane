function LODnode() {
}

LODnode.prototype.create = function create( inX, inY, inSize, inLevel ) {
	this.x = inX;
	this.y = inY;
	this.centerX = inX + inSize * 0.5;
	this.centerY = inY + inSize * 0.5;
	this.size = inSize;
	this.level = inLevel;
	this.height = 0;
	this.childs = [];
	
	if( 0 === inLevel ) {
		// If we are a leaf, stop the creation process
	}
	else {
		// Else, create childs
		var childSize = inSize * 0.5;
		
		for( var i = 0; i < 2; ++i ) {
			for( var j = 0; j < 2; ++j ) {
				var child = new LODnode();
				
				child.create( inX + childSize * j, inY + childSize * i, childSize, inLevel - 1 );

				this.childs[j * 2 + i] = child;
			}			
		}
	}
}

LODnode.prototype.intersectsSphere = function intersectsSphere( inRange, inPosition ) {
	var xp = this.centerX;
	var yp = this.height;
	var zp = this.centerY;
	
	var distance = Math.sqrt( 
		(inPosition.x - xp) * (inPosition.x - xp) +
		(inPosition.z - yp) * (inPosition.z - yp) +
		(inPosition.y - zp) * (inPosition.y - zp) 
	);
	
	//console.log( distance + " " + inRange );
	return ( distance - this.size * 0.5 ) < inRange;
}

LODnode.prototype.frustumIntersect = function frustumIntersect( inFrustum ) {
	return true ;
}

LODnode.prototype.select = function select( inRanges, inFrustum, inPosition, outSelection ) {

	if( !this.intersectsSphere( inRanges[ this.level ], inPosition ) ) {
		// No node or child nodes were selected; return false so that our parent node handles our area 
		//console.log("!this.intersectsSphere level");
		return false;
	}
	
	if( !this.frustumIntersect( inFrustum ) ) {
		/* We are out of frustum, select nothing but return true to mark this node as having been 
		   correctly handled so that our parent node does not select itself over our area */
		//console.log("frustumIntersect");
		return true; 
	}
	
	if( 0 === this.level ) {
		// We are in our LOD range and we are the last LOD level 
		//console.log("0 === this.level");
		outSelection.add( this );
		return true;
	}
	else {
		if( !this.intersectsSphere( inRanges[this.level-1], inPosition ) ) {
			/* We are in range of our LOD level and we are not the last level: if we are also in range 
			   of a more detailed LOD level, then some of our child nodes will need to be selected 
			   instead in order to display a more detailed mesh.
			   We cover the required lodLevel range */
			outSelection.nodes.push( this );
		}
		else {
			/* We cover the more detailed lodLevel range: some or all of our four child nodes will 
			   have to be selected instead */
			for( var key in this.childs ) {
				var childNode = this.childs[key];
				if( !childNode.select( inRanges, inFrustum, inPosition, outSelection ) ) {
					//console.log("childNode.select?");
					outSelection.add( this, childNode.x, childNode.y, true );
				}
			}
		}

		return true;
	}


};