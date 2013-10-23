///// TODO: 
// Use some composition and "Command Patterns" to reduce all these
// nasty instanceof checks and make things more modular

PIXI.WebGLExtras = function(gl) {
	this.gl = gl;
};



PIXI.WebGLExtras.prototype.isExtra = function(displayObject) {
//pretty ugly.. we should do some composition instead
	return (displayObject instanceof PIXI.TilingSprite
		|| displayObject instanceof PIXI.Strip
		|| displayObject instanceof PIXI.CustomRenderable
		|| displayObject instanceof PIXI.Graphics
		|| displayObject instanceof PIXI.FilterBlock);
};

/**
 * Determines the type of extra and initializes it accordingly.
 * If the type is not one of the supported extras, no action is taken.
 * 
 * @method initExtra
 * @param displayObject {DisplayObject} the extra
 * @private
 */
PIXI.WebGLExtras.prototype.init = function(displayObject) {
	if(displayObject instanceof PIXI.TilingSprite)
	{
		// add to a batch!!
		this.initTilingSprite(displayObject);
	//	this.batchs.push(displayObject);
		
	}
	else if(displayObject instanceof PIXI.Strip)
	{
		// add to a batch!!
		this.initStrip(displayObject);
	//	this.batchs.push(displayObject);
	}
	else if (displayObject instanceof PIXI.CustomRenderable)
	{
		displayObject.initWebGL(this);
	}
	else if(displayObject)// instanceof PIXI.Graphics)
	{
		//displayObject.initWebGL(this);
		
		// add to a batch!!
		//this.initStrip(displayObject);
		//this.batchs.push(displayObject);
	}
	//TODO: CustomRenderable initWebGL
};


/**
 * Renders an extra (TilingSprite, Strip, CustomRenderable, Graphics,
 * or FilterBlock).
 *
 * @method renderSpecial
 * @param renderer {WebGLRenderer}
 * @param renderable {DisplayObject}
 * @param projection {Object}
 * @private
 */
PIXI.WebGLExtras.prototype.render = function(renderer, renderable, projection)
{
	var worldVisible = true;
	if (!renderable)
		return;
	
	if (renderable.isShowing)
		worldVisible = renderable.isShowing();
	else if (renderable.visible)
		worldVisible = renderable.visible;
	
	if(renderable instanceof PIXI.TilingSprite)
	{
		if(worldVisible)this.renderTilingSprite(renderable, projection);
	}
	else if(renderable instanceof PIXI.Strip)
	{
		if(worldVisible)this.renderStrip(renderable, projection);
	}
	else if(renderable instanceof PIXI.CustomRenderable)
	{ //vcount here???
		if(worldVisible) renderable.renderWebGL(renderer, projection);
	}
	else if(renderable instanceof PIXI.Graphics)
	{
		if(worldVisible && renderable.renderable) PIXI.WebGLGraphics.renderGraphics(renderer, renderable, projection);
	}
	else if(renderable instanceof PIXI.FilterBlock)
	{
		var gl = this.gl;
		/*
		 * for now only masks are supported..
		 */

		if(renderable.open)
		{
			gl.enable(gl.STENCIL_TEST);
				
			gl.colorMask(false, false, false, false);
			gl.stencilFunc(gl.ALWAYS,1,0xff);
			gl.stencilOp(gl.KEEP,gl.KEEP,gl.REPLACE);
  
			PIXI.WebGLGraphics.renderGraphics(renderer, renderable.mask, projection);
			
			// we know this is a render texture so enable alpha too..
			gl.colorMask(true, true, true, true);
			gl.stencilFunc(gl.NOTEQUAL,0,0xff);
			gl.stencilOp(gl.KEEP,gl.KEEP,gl.KEEP);
		}
		else
		{
			gl.disable(gl.STENCIL_TEST);
		}
	}
}

/**
 * Initializes a tiling sprite
 *
 * @method initTilingSprite
 * @param sprite {TilingSprite} The tiling sprite to initialize
 * @private
 */
PIXI.WebGLExtras.prototype.initTilingSprite = function(sprite)
{
	var gl = this.gl;

	// make the texture tilable..
			
	sprite.verticies = new Float32Array([0, 0,
										  sprite.width, 0,
										  sprite.width,  sprite.height,
										 0,  sprite.height]);
					
	sprite.uvs = new Float32Array([0, 0,
									1, 0,
									1, 1,
									0, 1]);
				
	sprite.colors = new Float32Array([1,1,1,1]);
	
	sprite.indices =  new Uint16Array([0, 1, 3,2])//, 2]);
	
	sprite._vertexBuffer = gl.createBuffer();
	sprite._indexBuffer = gl.createBuffer();
	sprite._uvBuffer = gl.createBuffer();
	sprite._colorBuffer = gl.createBuffer();
						
	gl.bindBuffer(gl.ARRAY_BUFFER, sprite._vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, sprite.verticies, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, sprite._uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,  sprite.uvs, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, sprite._colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, sprite.colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sprite._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sprite.indices, gl.STATIC_DRAW);
    
//    return ( (x > 0) && ((x & (x - 1)) == 0) );
	
	if(sprite.texture.baseTexture._glTexture)
	{
    	gl.bindTexture(gl.TEXTURE_2D, sprite.texture.baseTexture._glTexture);
    	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		sprite.texture.baseTexture._powerOf2 = true;
	}
	else
	{
		sprite.texture.baseTexture._powerOf2 = true;
	}
}

/**
 * Renders a Strip
 *
 * @method renderStrip
 * @param strip {Strip} The strip to render
 * @param projection {Object}
 * @private
 */
PIXI.WebGLExtras.prototype.renderStrip = function(strip, projection)
{
	var gl = this.gl;
	var shaderProgram = PIXI.shaderProgram;
//	mat
	//var mat4Real = PIXI.mat3.toMat4(strip.worldTransform);
	//PIXI.mat4.transpose(mat4Real);
	//PIXI.mat4.multiply(projectionMatrix, mat4Real, mat4Real )

	
	gl.useProgram(PIXI.stripShaderProgram);

	var m = PIXI.mat3.clone(strip.worldTransform);
	
	PIXI.mat3.transpose(m);
	
	// set the matrix transform for the 
 	gl.uniformMatrix3fv(PIXI.stripShaderProgram.translationMatrix, false, m);
	gl.uniform2f(PIXI.stripShaderProgram.projectionVector, projection.x, projection.y);
	gl.uniform1f(PIXI.stripShaderProgram.alpha, strip.worldAlpha);

/*
	if(strip.blendMode == PIXI.blendModes.NORMAL)
	{
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	}
	else
	{
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR);
	}
	*/
	
	
	if(!strip.dirty)
	{
		
		gl.bindBuffer(gl.ARRAY_BUFFER, strip._vertexBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, strip.verticies)
	    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
		
		// update the uvs
	   	gl.bindBuffer(gl.ARRAY_BUFFER, strip._uvBuffer);
	    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
			
	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, strip.texture.baseTexture._glTexture);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, strip._colorBuffer);
	    gl.vertexAttribPointer(shaderProgram.colorAttribute, 1, gl.FLOAT, false, 0, 0);
		
		// dont need to upload!
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, strip._indexBuffer);
	}
	else
	{
		strip.dirty = false;
		gl.bindBuffer(gl.ARRAY_BUFFER, strip._vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, strip.verticies, gl.STATIC_DRAW)
	    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 2, gl.FLOAT, false, 0, 0);
		
		// update the uvs
	   	gl.bindBuffer(gl.ARRAY_BUFFER, strip._uvBuffer);
	   	gl.bufferData(gl.ARRAY_BUFFER, strip.uvs, gl.STATIC_DRAW)
	    gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
			
	    gl.activeTexture(gl.TEXTURE0);
	    gl.bindTexture(gl.TEXTURE_2D, strip.texture.baseTexture._glTexture);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, strip._colorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, strip.colors, gl.STATIC_DRAW)
	    gl.vertexAttribPointer(shaderProgram.colorAttribute, 1, gl.FLOAT, false, 0, 0);
		
		// dont need to upload!
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, strip._indexBuffer);
	    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, strip.indices, gl.STATIC_DRAW);
	    
	}
	//console.log(gl.TRIANGLE_STRIP);
	
	gl.drawElements(gl.TRIANGLE_STRIP, strip.indices.length, gl.UNSIGNED_SHORT, 0);
    
  	gl.useProgram(PIXI.shaderProgram);
}

/**
 * Renders a TilingSprite
 *
 * @method renderTilingSprite
 * @param sprite {TilingSprite} The tiling sprite to render
 * @param projectionMatrix {Object}
 * @private
 */
PIXI.WebGLExtras.prototype.renderTilingSprite = function(sprite, projectionMatrix)
{
	var gl = this.gl;
	var shaderProgram = PIXI.shaderProgram;
	
	// var tilePositionX = sprite.tilePosition.x;
	// var tilePositionY = sprite.tilePosition.y;
	var tilePositionX = sprite.flipX ? -sprite.tilePosition.x : sprite.tilePosition.x;
	var tilePositionY = sprite.flipY ? -sprite.tilePosition.y : sprite.tilePosition.y;
	var tileScale = sprite.tileScale;
	
	var offsetX =  tilePositionX/sprite.texture.baseTexture.width;
	var offsetY =  tilePositionY/sprite.texture.baseTexture.height;
	
	var scaleX =  (sprite.width / sprite.texture.baseTexture.width)  / tileScale.x;
	var scaleY =  (sprite.height / sprite.texture.baseTexture.height) / tileScale.y;

	var u1 = this.flipX ? ((1 * scaleX) - offsetX) : 0 - offsetX;
	var u2 = this.flipX ? 0 - offsetX : ((1 * scaleX) - offsetX);

	var v1 = this.flipY ? ((1 * scaleY) - offsetY) : 0 - offsetY;
	var v2 = this.flipY ? 0 - offsetY : ((1 * scaleY) - offsetY);
	//TODO: tiling sprite is broken for default PIXI renderer.. use BATCH_SIMPLE instead
	//TODO: change vertices for size...
	sprite.uvs[0] = u1;
	sprite.uvs[1] = v1;
	
	sprite.uvs[2] = u2;
	sprite.uvs[3] = v1;
	
	sprite.uvs[4] = u2;
	sprite.uvs[5] = v2;
	
	sprite.uvs[6] = u1;
	sprite.uvs[7] = v2;

	gl.bindBuffer(gl.ARRAY_BUFFER, sprite._uvBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, sprite.uvs)
	
	this.renderStrip(sprite, projectionMatrix);
}

/**
 * Initializes a strip to be rendered
 *
 * @method initStrip
 * @param strip {Strip} The strip to initialize
 * @private
 */
PIXI.WebGLExtras.prototype.initStrip = function(strip)
{
	// build the strip!
	var gl = this.gl;
	var shaderProgram = this.shaderProgram;
	
	strip._vertexBuffer = gl.createBuffer();
	strip._indexBuffer = gl.createBuffer();
	strip._uvBuffer = gl.createBuffer();
	strip._colorBuffer = gl.createBuffer();
	
	gl.bindBuffer(gl.ARRAY_BUFFER, strip._vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, strip.verticies, gl.DYNAMIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, strip._uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,  strip.uvs, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, strip._colorBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, strip.colors, gl.STATIC_DRAW);

	
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, strip._indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, strip.indices, gl.STATIC_DRAW);
}
