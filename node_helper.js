const NodeWebcam = require( "node-webcam" );
const moment = require("moment");
const path = require("path");
const exec = require("child_process").exec;
var fs = require('fs');

var log = () => {
	//do nothing
};

var NodeHelper = require("node_helper");

module.exports = NodeHelper.create({
	start: function() {
		this.devices = [];
		this.device = false;
	},

 /**
  * Initialize the selfie module.       
  * @param {object} payload - The payload object containing the config.       
  */
	initialize: function(payload) {
		this.config = payload;
		this.photoDir = path.resolve(__dirname, this.config.photoDir);
		if (!fs.existsSync(this.photoDir)) fs.mkdirSync(this.photoDir);
		if (payload.debug) {
			log = (...args) => {
				console.log("[SELFIE]", ...args);
			};
		}
		var Webcam = NodeWebcam.create({});
		Webcam.list((list)=>{
			log("Searching camera devices...");
			if (!list || list.length <= 0) {
				log ("Cannot find any camera in this computer.");
				return;
			}
			this.devices.concat(list);
			log("Detected devices:", list);
			if (payload.device) {
				var idx = list.indexOf(payload.device);
				if (idx !== -1) {
					this.device = list[idx];
					log(`'${payload.device}' will be used.`);
				} else {
					log(`Cannot find '${payload.device}' in the list. '${list[0]}' be selected as default.`);
				}
			} else {
				log(`Default camera '${list[0]}' will be used.`);
			}
			this.sendSocketNotification("INITIALIZED");
		});
	},

	
 /**
  * Receives a notification from the frontend and performs the appropriate action.
  * @param {string} noti - The notification to receive.
  * @param {any} payload - The payload of the notification.
  */
	socketNotificationReceived: function(noti, payload) {
		if (payload.debug) log("Notification received: " + noti);
		if (noti == "INIT") {
			this.initialize(payload);
		}
		if (noti == "SHOOT") {
			console.log('shoot payload:', payload)
			this.shoot(payload);
		}
		if (noti == "EMPTY") {
			exec(`rm ${this.photoDir}/*.jpg`, (err, sto, ste)=>{
				log("Cleaning directory:", this.photoDir);
				if (err) this.log("Error:", err);
				if (sto) this.log(sto);
				if (ste) this.log(ste);
			});
		}
	},

 /**
  * Takes a photo using the NodeWebcam library.
  * @param {Object} payload - The payload object containing the following.
  * @param {Object} payload.options - The webcam options containg the following.
  * @param {number} payload.options.width - The width of the photo.
  * @param {number} payload.options.height - The height of the photo.
  * @param {number} payload.options.quality - The quality of the photo.
  * @param {number} payload.options.delay - The delay between taking the photo and sending the result.
  * @param {boolean} payload.options.saveShots - Whether or not to save the photo.
  * @param {
  */
	shoot: function(payload) {
		var uri = moment().format("YYMMDD_HHmmss") + ".jpg";
		var filename = path.resolve(this.photoDir, uri);
		var opts = Object.assign ({
			width: this.config.width ?? 1280,
			height: this.config.height ?? 720,
			quality: this.config.quality ?? 100,
			delay: 0,
			saveShots: true,
			output: "jpeg",
			device: this.device,
			callbackReturn: "location",
			verbose: this.config.debug
		}, (payload.options) ? payload.options : {});
		NodeWebcam.capture(filename, opts, (err, data)=>{
			if (err) log("Error:", err);
			log("Photo is taken:", data);
			this.sendSocketNotification("__SHOOT-RESULT__", {
				path: data,
				uri: uri,
				session: payload.session
			});
			this.debugLog("Photo is taken.", `Path: ${data}.`)
		});
	},

 /**
  * Logs the given messages to the console if the debug flag is set.           
  * @param {...string} msgs - The messages to log.           
  */
	debugLog: function(...msgs) {
		if (this.config.debug) {
			msgs.forEach(msg => {
				console.log(msg)
			})
		}
	},
});
