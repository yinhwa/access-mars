// Copyright 2017 Google Inc.
//
//   Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
////   Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.


/**
 * map-card
 *
 * UI component for displaying the map teleportation interface when
 * the user clicks on the horizon marker.
 *
 * The card will position itself towards the camera when shown.
 */

import { Scene } from '../core/scene';
import { CardMesh } from '../meshes/card-mesh';
import { TextColorHex } from '../core/colors';
import { PlatformUtils } from '../utils/platform-utils';

const DESKTOP_Y_OFFSET = 0.3;
const HEADER_HEIGHT = 0.1;
const HEADER_Y_OFFSET = 0.566;
const TEXT_LEFT_PADDING = 0.025;

if ( typeof AFRAME !== 'undefined' && AFRAME ) {
	AFRAME.registerComponent( 'orientation-card', {

		dependencies: [ 'visible', 'look-at-target' ],

		schema: {
			height: { type: 'number', default: 1 },
			width: { type: 'number', default: 2 },
			title: { type: 'string' },
		},

		init: function() {
			this.positionDummy = document.getElementById( 'ui-dummy' );
			this.offsetDummy = document.getElementById( 'map-card-offset' );
			this.camera = document.getElementById( 'camera' );

			// Set up look-at-target component so that the card faces the camera directly.
			this.el.setAttribute( 'look-at-target', {
				axis: 'xyz',
				target: '#camera',
				alwaysUpdate: false,
				offset: new THREE.Vector3( 0, Math.PI, 0 )
			});

			// This group is used to hold the various meshes that aren't represented
			// by separate entity DOM elements. This includes the background plane
			// and the header plane. This group is assigned to the back-meshes element
			// so that the background elements are drawn behind the foreground elements
			// correctly.
			this.group = new THREE.Group();
			this.backEl = document.getElementById( 'orientation-back-meshes' );
			this.backEl.setObject3D( 'mesh', this.group );

			// Create the background plane mesh
			this.background = new CardMesh( this.data.width, this.data.height );

			// Create the header plane mesh
			this.header = new CardMesh( this.data.width, HEADER_HEIGHT );
			this.header.setPosition( 0, HEADER_Y_OFFSET );

			// Create and set up the hitbox
			this.hitbox = document.createElement( 'a-entity' );
			this.hitbox.setAttribute( 'position', { z: -1 } );
			this.hitbox.setAttribute( 'event-priority', 100 );
			this.hitbox.setAttribute( 'hitbox', {
				expansion: 20,
				cursorScale: 0.3
			});

			// Create and position the header text entity
			this.headerEl = document.createElement( 'a-entity' );
			this.headerEl.setAttribute( 'position', {
				x: -this.data.width / 2 + TEXT_LEFT_PADDING,
				y: HEADER_Y_OFFSET - HEADER_HEIGHT / 2 + 0.025,
				z: 0
			});

			// Create the title text entity
			this.headerText = document.createElement( 'a-entity' );
			this.headerText.setAttribute( 'info-card-text', {
				color: TextColorHex,
				font: 'fonts/NowAlt-Bold.json',
				letterSpacing: 6,
				value: this.data.title.toUpperCase(),
				width: this.data.width,
				wrapCount: 64
			});

			// Add 'em up
			this.backEl.appendChild( this.hitbox );
			this.backEl.appendChild( this.headerEl );
			this.headerEl.appendChild( this.headerText );
			this.group.add( this.background.mesh );
			this.group.add( this.header.mesh );

			// Show the card when the 'visible' state is added
			this.el.addEventListener( 'stateadded', event => {
				if ( event.detail.state !== 'visible' ) return;
				ga( 'send', 'event', 'orientation-card', 'opened', '' );
				this.onShow();
			});

			// Dismiss the card when the 'visible' state is removed
			this.el.addEventListener( 'stateremoved', event => {
				if ( event.detail.state !== 'visible' ) return;
				this.onHide();
			});

			// Dismiss the card if the hitbox is clicked
			this.backEl.addEventListener( 'raycaster-cursor-up', event => {
				ga( 'send', 'event', 'orientation-card', 'dismissed', '' );
				this.onHide();
			});

			// Bubble the hide-complete event from the header mesh up thru the entity element.
			// The header mesh is the last of the meshes to play the transition animation.
			this.header.on( 'hide-complete', event => {
				this.el.emit( 'hide-complete', null, false );
			});
		},

		onShow: function() {
			// Set visible states for all relevant child entities
			this.el.sceneEl.addState( 'modal' );
			this.headerText.addState( 'visible' );

			// Show the background and header meshes. Delay the background mesh
			// so that the transition feels natural.
			this.background.show( 0.25, 0.05 );
			this.header.show( 0.05 );

			// Apply platform-specific z offset
			this.positionDummy.setAttribute( 'position', { x: 0, y: 0, z: PlatformUtils.getCardZOffset() } );

			// Update position and look-at rotation to match the current camera location
			const uiPosition = this.positionDummy.object3D.getWorldPosition();
			this.el.setAttribute( 'position', { x: uiPosition.x, y: uiPosition.y, z: uiPosition.z });
			this.el.components[ 'look-at-target' ].update();
		},

		onHide: function() {
			// Remove visible states for all relevant child entities
			this.el.sceneEl.removeState( 'modal' );
			this.el.removeState( 'visible' );
			this.headerText.removeState( 'visible' );

			// Hide the background and header meshes. Delay the header
			// mesh animation so that the transition feels natural.
			this.background.hide();
			this.header.hide( 0.05, 0.25 );
		},

		tick: function( t, dt ) {
			this.background.tick( dt );
			this.header.tick( dt );

			// Set this element's visiblity property based on the header mesh's
			// animIn value. 
			this.el.setAttribute( 'visible', this.header.animIn > 0 );
		}
	});
}
