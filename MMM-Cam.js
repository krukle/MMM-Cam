Module.register("MMM-Cam", {
	defaults: {
		debug: true,
		width:1280,
		height:720, // In some webcams, resolution ratio might be fixed so these values might not be applied.
		quality: 100, //Of course.
		device: null, // For default camera. Or,
		// device: "USB Camera" <-- See the backend log to get your installed camera name.
		shootMessage: "Smile!",
		shootCountdown: 3,
		displayCountdown: true,
		displayResult: true,
		displayButton: null, // null = no button or name of FontAwesome icon
		playShutter: true,
		shutterSound: "shutter.mp3",
		resultDuration: 120,
		photoDir: "photos",
},

	getStyles: function() {
		return ["MMM-Cam.css", "font-awesome.css"];
	},

	start: function() {
		this.session = {};
		this.sendSocketNotification("INIT", this.config);
		this.lastPhoto = null;
	},

	getDom: function() {
		if (this.config.displayButton != null) {
			var wrapper = document.createElement("div");
			// wrapper.innerHTML = "Take a Selfie";

			var img = document.createElement("span");
			img.className = "fa fa-" + this.config.displayButton + " fa-large";
			img.classList.add("large");

			var session = {};
			img.addEventListener("click", () => this.shoot(this.config, session));
			wrapper.appendChild(img);
			return wrapper;
		}
	},

	prepare: function() {
		var dom = document.createElement("div");
		dom.id = "SELFIE";
		var win = document.createElement("div");
		win.classList.add("window");
		var message = document.createElement("div");
		message.classList.add("message");
		message.innerHTML = this.config.shootMessage;
		var count = document.createElement("div");
		count.classList.add("count");
		count.innerHTML = this.config.shootCountdown;

		win.appendChild(message);
		win.appendChild(count);
		dom.appendChild(win);

		var shutter = document.createElement("audio");
		shutter.classList.add("shutter");
		if (this.config.playShutter) {
			shutter.src = "modules/MMM-Cam/" + this.config.shutterSound;
		}
		dom.appendChild(shutter);

		var result = document.createElement("result");
		result.classList.add("result");

		dom.appendChild(result);
		document.body.appendChild(dom);
	},

	socketNotificationReceived: function(noti, payload) {
		if (noti == "__SHOOT-RESULT__") {
			this.postShoot(payload);
		}

		if (noti == "TAKE-SELFIE") {
			var session = {};
			var pl = {
				option: {},
				callback:null,
			};
			pl = Object.assign({}, pl, payload);
			if (typeof pl.callback == "function") {
				key = Date.now() + Math.round(Math.random() * 1000);
				this.session[key] = pl.callback;
				session["key"] = key;
				session["ext"] = "CALLBACK";
			}
			this.shoot(pl.option, session);
		}
		if (noti == "EXIT-CAM") {
			this.debugLog("Notifcation received to close MMM-Cam.")
			this.exitCam();
		}
	},
	
	debugLog: function(...msgs) {
		if (this.config.debug) {
			msgs.forEach(msg => {
				console.log(`MMM-Cam [DEBUG]: ${msg}`);
			})
		}
	},
	
	exitCam: function() {
		const self = this
		if (self.config.displayResult) {
			document.querySelector("#SELFIE").classList.remove("shown");
			document.querySelector("#SELFIE .result").classList.remove("shown");
		}
	},

	notificationReceived: function(noti, payload, sender) {
		if (noti == "DOM_OBJECTS_CREATED") {
			this.prepare();
			//this.shoot()
		}
		if (noti == "SELFIE-EMPTY-STORE") {
			this.sendSocketNotification("EMPTY");
		}
		if (noti == "SELFIE-LAST") {
			this.showLastPhoto(this.lastPhoto);
		}
	},

	shoot: function(option={}, session={}) {
		var showing = this.config.displayCountdown;
		var sound = (option.hasOwnProperty("playShutter")) ? option.playShutter : this.config.playShutter;
		var countdown = (option.hasOwnProperty("shootCountdown")) ? option.shootCountdown : this.config.shootCountdown;
		var con = document.querySelector("#SELFIE");
		if (showing) con.classList.toggle("shown");
		var win = document.querySelector("#SELFIE .window");
		if (showing) win.classList.toggle("shown");

		const loop = (count) => {
			var c = document.querySelector("#SELFIE .count");
			c.innerHTML = count;
			if (count < 0) {
				this.sendSocketNotification("SHOOT", {
					option: option,
					session: session
				});

				var shutter = document.querySelector("#SELFIE .shutter");
				if (sound) shutter.play();
				if (showing) win.classList.toggle("shown");
				if (showing) con.classList.toggle("shown");
			} else {
				setTimeout(()=>{
					count--;
					loop(count);
				}, 1000);
			}
		};
		loop(countdown);
	},

	postShoot: function(result) {
		if (result.session.ext == "CALLBACK") {
			if (this.session.hasOwnProperty(result.session.key)) {
				callback = this.session[result.session.key];
				callback({
					path: result.path,
					uri: result.uri
				});
				this.session[result.session.key] = null;
				delete this.session[result.session.key];
			}
		}
		
		this.sendNotification("SELFIE_RESULT", result);
		this.sendNotification("GPHOTO_UPLOAD", result.path);
		this.sendNotification("MYCROFT_COMMAND", {
			eventName: "cam-skill:selfie_taken",
			data: {
				selfie: result.path,
				resultDuration: this.config.resultDuration
			}
		})
		this.lastPhoto = result;
		this.showLastPhoto(result);
		this.debugLog("Selfie taken notification sent to mycroft.")
	},

	showLastPhoto: function(result) {
		this.debugLog("Showing last photo.");
		var con = document.querySelector("#SELFIE");
		if (this.config.displayResult) con.classList.toggle("shown");
		var rd = document.querySelector("#SELFIE .result");
		rd.style.backgroundImage = `url(${this.data.path}/${this.config.photoDir}/${result.uri})`;
		if (this.config.displayResult) rd.classList.toggle("shown");
	}
});
