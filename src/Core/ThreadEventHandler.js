/**
 * Core/ThreadEventHandler.js
 *
 * Handler data received from Main Thread and process.
 *
 * This file is part of ROBrowser, Ragnarok Online in the Web Browser (http://www.robrowser.com/).
 *
 * @author Vincent Thibault
 */


importScripts('../Vendors/require.js');
requirejs.config({
	baseUrl: "../"
});

require(['Core/FileManager', 'Core/FileSystem', 'Loaders/MapLoader'],
function(      FileManager,        FileSystem,           MapLoader )
{
	"use strict";


	/**
	 *	Send an Error to main thread
	 *
	 * @param {string} error
	 */
	function SendError()
	{
		postMessage({ type:"THREAD_ERROR", data: Array.prototype.slice.call(arguments,0) });
	}


	/**
	 *	Send a message log to main thread
	 *
	 * @param {string} error
	 */
	function SendLog()
	{
		postMessage({ type:"THREAD_LOG", data: Array.prototype.slice.call(arguments,0) });
	}


	/**
	 * Receiving data, process action
	 *
	 * @param {object} event - EventHandler
	 */
	onmessage = function Receive( event )
	{
		var msg  = event.data;
		var args = [];

		switch( msg.type ) {

			// Modify client host
			case "SET_HOST":
				FileManager.remoteClient = msg.data;
				break;


			// Save full client and use it
			case "CLIENT_INIT":
				FileSystem.bind('onprogress', function(progress){
					postMessage({ type:'CLIENT_SAVE_PROGRESS', data:progress });
				});

				// full client saved !
				FileSystem.bind('onuploaded', function(){
					postMessage({ type:'CLIENT_SAVE_COMPLETE' });
				});

				FileManager.onGameFileLoaded = function(filename){
					SendLog('Success to load GRF file "' + filename + '"');
				};

				FileManager.onGameFileError = function(filename, error){
					SendError('Error loading GRF file "' + filename + '" : ' + error);
				};

				// Start loading GRFs files
				FileSystem.bind('onready', function(){
					FileManager.clean();
					FileManager.init( msg.data.grfList );

					postMessage({
						uid:       msg.uid,
						arguments: [ FileManager.gameFiles.length, null, msg.data ]
					});
				});

				// Saving full client
				FileSystem.init( msg.data.files, msg.data.save );
				break;


			// Get a file from client/grf
			case "GET_FILE":
				FileManager.get( msg.data.filename, function( result, error){
					if (error) {
						SendError( '[Thread] ' + error + ' ('+ msg.data.filename +')' );
					}

					if (msg.uid) {
						postMessage({
							uid:       msg.uid,
							arguments: [ result, error, msg.data ]
						});
					}
				});
				break;


			// Get and load a file from client/grf
			case "LOAD_FILE":
				FileManager.load( msg.data.filename, function( result, error){
					if (error) {
						SendError( '[Thread] ' + error + ' ('+ msg.data.filename +')' );
					}

					if (msg.uid) {
						postMessage({
							uid:       msg.uid,
							arguments: [ result, error, msg.data ]
						});
					}
				});
				break;


			// Search a file in Client
			case "SEARCH_FILE":
				if (msg.uid) {
					postMessage({
						uid:       msg.uid,
						arguments: [ FileManager.search( msg.data ), null, msg.data ]
					});
				}
				break;


			// Start loading a map
			case "LOAD_MAP":
				var map = new MapLoader();

				map.onprogress = function(progress){
					postMessage({ type:'MAP_PROGRESS', data:progress });
				};

				map.onload = function( success, error){
					if (msg.uid) {
						postMessage({
							uid:       msg.uid,
							arguments:[ success, error, msg.data ]
						});
					}
				};

				map.ondata = function( type, data ) {
					postMessage({ type: type, data:data });
				};

				map.load( msg.data );
				break;
		}
	};


	/**
	 * Once the thread is ready
	 */
	postMessage({ type: "THREAD_READY" });
});