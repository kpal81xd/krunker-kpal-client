const path = require("path");
const url = require("url");
const os = require("os");
const fs = require("fs");

const CONSTS = {
  GAME_URL: /https?:\/\/(.+\.)?krunker\.io/,
  SOCIAL_URL: /https?:\/\/(.+\.)?krunker\.io\/social\.html/,
  EDITOR_URL: /https?:\/\/(.+\.)?krunker\.io\/editor\.html/,
  VIEWER_URL: /https?:\/\/(.+\.)?krunker\.io\/viewer\.html/,

  DEBUG: process.argv.includes("--dev") || false,
  AMD_CPU: os
    .cpus()
    .map((c) => c.model.toLowerCase())
    .join("")
    .includes("amd"),
  NO_CACHE: { extraHeaders: "pragma: no-cache\n" },

  CLIENT_ID: "566623836628582412",

  PROFILES: [
    ["default", "Default"],
    ["srgb", "sRGB"],
    ["generic-rgb", "Generic RGB"],
    ["color-spin-gamma24", "Color spin with gamma 2.4"],
  ],

  REGIONS: [
    ["de-fra", "FRA"],
    ["us-fl", "MIA"],
    ["us-ca-sv", "SV"],
    ["us-nj", "NY"],
    ["sgp", "SIN"],
    ["jb-hnd", "TOK"],
    ["au-syd", "SYD"],
  ],
  MODES: [
    ["ctf", "CTF"],
    ["ffa", "FFA"],
    ["tdm", "TDM"],
    ["point", "POINT"],
    ["king", "KING"],
  ],
  MAPS: [
    ["Burg", "Burg"],
    ["Littletown", "Littletown"],
    ["Sandstorm", "Sandstorm"],
    ["Subzero", "Subzero"],
    ["Undergrowth", "Undergrowth"],
    ["Freight", "Freight"],
    ["Shipyard", "Shipyard"],
    ["Citadel", "Citadel"],
    ["Lostworld", "Lostworld"],
  ],
  TYPES: [
    ["public", "Public"],
    ["custom", "Custom"],
  ],
};

const tools = (electron, config, dirname) => {
  const document = window.document;
  const { ipcRenderer, remote } = electron;
  const { dialog } = remote;

  let gameWindow, menuWindow;
  let menuAlert;

  var fpsInterval;

  class Tools {
    constructor(src) {
      if (src == "menu") {
        menuWindow = remote.getCurrentWindow();
        gameWindow = menuWindow.getParentWindow();

        menuAlert = (msg) => alert(msg);
      } else {
        gameWindow = remote.getCurrentWindow();
        menuWindow = gameWindow.getChildWindows()[0];

        menuAlert = (msg) => menuWindow.webContents.executeJavaScript(`alert('${msg}')`);
      }

      this.features = {
        rebootResetAll: {
          html: (_) => {
            return `
							<div class="settName">
								<a> </a>
								<a style="font-size: 20px" onclick="window.tools.triggerEvent('rebootResetAll', this.innerText.toLowerCase(), false)">Reset All</a>
								 <h style="padding-left: 5px; padding-right: 5px;"> | </h>
								<a style="font-size: 20px" onclick="window.tools.triggerEvent('rebootResetAll', this.innerText.toLowerCase(), false)">Reboot</a>
							</div>`;
          },
          preload: (v) => {
            switch (v) {
              case "reset all":
                if (confirm("Are you sure you want to clear all client settings?")) {
                  config.clear();
                  alert("Settings Cleared! Client will now restart");
                  remote.app.relaunch();
                  remote.app.quit();
                }
                break;
              case "reboot":
                alert("Client will now restart");
                remote.app.relaunch();
                remote.app.quit();
                break;
            }
          },
        },
        gameHeader: {
          name: "Game",
          html: (_) => {
            return `
							<div id="gameHeader" class="setHed">
								${this.features.gameHeader.name}
							</div>`;
          },
        },
        serverURL: {
          name: "URL",
          value: "https://krunker.io",
          html: (_) => {
            return `
							<div class="settName">
								${this.features.serverURL.name}
								<a id='serverURL' class='label' style='color: green' onclick="window.tools.triggerEvent('serverURL', this.innerText)">${this.features.serverURL.value}</a>
							</div>`;
          },
          menu: (v) => {
            this.clipboardCopy(v);
          },
        },
        clientHeader: {
          name: "Client",
          html: (_) => {
            return `
							<div id="clientHeader" class="setHed">
								${this.features.clientHeader.name}
							</div>`;
          },
        },
        keybind: {
          name: "Key Bind",
          value: config.get("tools_keybind", "Tab"),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.keybind.name}
								<a style="font-size: 20px; float: right; margin-left: 8px" onclick="window.tools.triggerEvent('keybind', keybindInput.value)">Set</a>
								<input id="keybindInput" type="text" placeholder="Key Bind" name="text" value="${this.features.keybind.value}" style="width: 100px;"/>
							</div>`;
          },
          preload: (v) => {
            menuAlert("Changes will be made on restart");
          },
        },
        theme: {
          name: "KPal Theme",
          value: config.get("tools_theme", false),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.theme.name}
								<label class="switch" style="margin-left: 8px">
									<input type="checkbox" onclick="window.tools.triggerEvent('theme', this.checked)" ${
                    this.features.theme.value ? "checked" : ""
                  }>
									<span class="slider"></span>
								</label>
							</div>`;
          },
          preload: (v) => {
            menuAlert("Changes will be made on restart");
          },
        },
        vsync: {
          name: "Frame Rate Limit",
          value: config.get("tools_vsync", false),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.vsync.name}
								<label class="switch" style="margin-left: 8px">
									<input type="checkbox" onclick="window.tools.triggerEvent('vsync', this.checked)" ${
                    this.features.vsync.value ? "checked" : ""
                  } ${this.features.vsync.disabled ? "disabled" : ""}>
									<span class="slider" style="${this.features.vsync.disabled ? "background-color: red" : ""}"></span>
								</label>
							</div>`;
          },
          preload: (v) => {
            menuAlert("Changes will be made on restart");
          },
        },
        fpsCapSlider: {
          name: "Frame Rate Cap",
          value: config.get("tools_fpsCapSlider", 0),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.fpsCapSlider.name}
								<input id="fpsCapNumber" type="number" class="sliderVal" min="0" max="1200" value="${this.features.fpsCapSlider.value}" oninput="window.tools.triggerEvent('fpsCapSlider', this.value); fpsCapSlider.value = this.value;">
				            	<div class="slidecontainer">
				            		<input id="fpsCapSlider" type="range" min="0" max="1200" step="10" value="${this.features.fpsCapSlider.value}" class="sliderM" oninput="window.tools.triggerEvent('fpsCapSlider', this.value); fpsCapNumber.value = this.value;">
				            	</div>
							</div>`;
          },
          preload: (v) => {
            this.capFrameRate(v);
          },
        },
        d3d9: {
          name: "DX9 Rendering",
          value: config.get("tools_d3d9", false),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.d3d9.name}
								<label class="switch" style="margin-left: 8px">
									<input type="checkbox" onclick="window.tools.triggerEvent('d3d9', this.checked)" ${
                    this.features.d3d9.value ? "checked" : ""
                  } ${this.features.d3d9.disabled ? "disabled" : ""}>
									<span class="slider" style="${this.features.d3d9.disabled ? "background-color: red" : ""}"></span>
								</label>
							</div>`;
          },
          preload: (v) => {
            menuAlert("Changes will be made on restart");
          },
        },
        colorProfile: {
          name: "Color Profile",
          value: config.get("tools_colorProfile", "default"),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.colorProfile.name}
								<select onchange="window.tools.triggerEvent('colorProfile', this.value)">
									${CONSTS.PROFILES.map(
                    (v) =>
                      `<option value="${v[0]}" ${this.features.colorProfile.value == v[0] ? "selected" : ""}>${
                        v[1]
                      }</option>`
                  ).join("")}
								</select>
							</div>`;
          },
          preload: (v) => {
            menuAlert("Changes will be made on restart");
          },
        },
        matchmakingHeader: {
          name: "Match Making",
          html: (_) => {
            return `
							<div id="matchmakingHeader" class="setHed">
								${this.features.matchmakingHeader.name}
							</div>`;
          },
        },
        autoSearch: {
          name: "Auto-Search",
          value: config.get("tools_autoSearch", false),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.autoSearch.name}
								<label class="switch">
									<input type="checkbox" onclick="window.tools.triggerEvent('autoSearch', this.checked)" ${
                    this.features.autoSearch.value ? "checked" : ""
                  } ${this.features.autoSearch.disabled ? "disabled" : ""}>
									<span class="slider" style="${this.features.autoSearch.disabled ? "background-color: red" : ""}"></span>
								</label>
							</div>`;
          },
        },
        filterSelect: {
          name: "Filters",
          value: [
            config.get("tools_region", "any"),
            config.get("tools_mode", "any"),
            config.get("tools_map", "any"),
            config.get("tools_type", "any"),
          ],
          html: (_) => {
            return `
							<div class="settName">
								${this.features.filterSelect.name}
								<select id="filterRegion" onchange="window.tools.triggerEvent('region', this.value)">
									<option value="any" ${this.features.filterSelect.value[0] == "any" ? "selected" : ""}>Region</option>
									${CONSTS.REGIONS.map(
                    (v) =>
                      `<option value="${v[0]}" ${this.features.filterSelect.value[0] == v[0] ? "selected" : ""}>${
                        v[1]
                      }</option>`
                  ).join("")}
			                    </select>
								<select id="filterMode" onchange="window.tools.triggerEvent('mode', this.value)">
									<option value="any" ${this.features.filterSelect.value[1] == "any" ? "selected" : ""}>Mode</option>
									${CONSTS.MODES.map(
                    (v) =>
                      `<option value="${v[0]}" ${this.features.filterSelect.value[1] == v[0] ? "selected" : ""}>${
                        v[1]
                      }</option>`
                  ).join("")}
								</select>
								<select id="filterMap" onchange="window.tools.triggerEvent('map', this.value)">
									<option value="any" ${this.features.filterSelect.value[2] == "any" ? "selected" : ""}>Map</option>
									${CONSTS.MAPS.map(
                    (v) =>
                      `<option value="${v[0]}" ${this.features.filterSelect.value[2] == v[0] ? "selected" : ""}>${
                        v[1]
                      }</option>`
                  ).join("")}
								</select>
								<select id="filterType" onchange="window.tools.triggerEvent('type', this.value)">
									<option value="any" ${this.features.filterSelect.value[3] == "any" ? "selected" : ""}>Type</option>
									${CONSTS.TYPES.map(
                    (v) =>
                      `<option value="${v[0]}" ${this.features.filterSelect.value[3] == v[0] ? "selected" : ""}>${
                        v[1]
                      }</option>`
                  ).join("")}
								</select>
							</div>`;
          },
        },
        minPlayersSlider: {
          name: "Min Players",
          value: config.get("tools_minPlayersSlider", 0),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.minPlayersSlider.name}
								<input id="minPlayersNumber" type="number" class="sliderVal" min="0" max="8" value="${this.features.minPlayersSlider.value}" oninput="window.tools.triggerEvent('minPlayersSlider', this.value); minPlayersSlider.value = this.value;">
				            	<div class="slidecontainer">
				            		<input id="minPlayersSlider" type="range" min="0" max="8" step="1" value="${this.features.minPlayersSlider.value}" class="sliderM" oninput="window.tools.triggerEvent('minPlayersSlider', this.value); minPlayersNumber.value = this.value;">
				            	</div>
							</div>`;
          },
        },
        maxPlayersSlider: {
          name: "Max Players",
          value: config.get("tools_maxPlayersSlider", 8),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.maxPlayersSlider.name}
								<input id="maxPlayersNumber" type="number" class="sliderVal" min="0" max="8" value="${this.features.maxPlayersSlider.value}" oninput="window.tools.triggerEvent('maxPlayersSlider', this.value); maxPlayersSlider.value = this.value;">
				            	<div class="slidecontainer">
				            		<input id="maxPlayersSlider" type="range" min="0" max="8" step="1" value="${this.features.maxPlayersSlider.value}" class="sliderM" oninput="window.tools.triggerEvent('maxPlayersSlider', this.value); maxPlayersNumber.value = this.value;">
				            	</div>
							</div>`;
          },
        },
        searchMatch: {
          name: "Search",
          html: (_) => {
            return `
							<div class="settName">
								<a id="searchMatchStatus" style="font-size: 20px; text-decoration: none; color: orange"> </a>
								<a style="float: right; font-size: 20px" onclick="window.tools.triggerEvent('searchMatch')">${this.features.searchMatch.name}</a>
							</div>`;
          },
          preload: (s) => {
            this.searchMatch();
          },
        },
        moddingHeader: {
          name: "Modding",
          html: (_) => {
            return `
							<br><div id="moddingHeader" class="setHed">
								${this.features.moddingHeader.name}
							</div>`;
          },
        },
        customModels: {
          name: "Custom Models",
          value: config.get("tools_customModels", false),
          html: (_) => {
            return `
							<div class="settName">
								${this.features.customModels.name}
								<label class="switch" style="margin-left: 8px">
									<input type="checkbox" onclick="window.tools.triggerEvent('customModels', this.checked)" ${
                    this.features.customModels.value ? "checked" : ""
                  }>
									<span class="slider"></span>
								</label>
							</div>`;
          },
          preload: (v) => {
            menuAlert("Changes will be made on restart");
          },
          menu: (v) => {
            ["folderModels"].forEach((n) => (document.getElementById(`${n}Hdr`).style.display = v ? "block" : "none"));
          },
        },
        folderModels: {
          name: "Folder",
          value: config.get("tools_folderModels", ""),
          hide: !config.get("tools_customModels", false),
          html: (_) => {
            return `
							<div id="folderModelsHdr" class="settName indent" style="display: ${
                this.features.folderModels.hide ? "none" : "block"
              }">
								${this.features.folderModels.name}
								<a style="font-size: 20px; float: right; margin-left: 8px" onclick="window.tools.openFolder().then(folder => {window.tools.triggerEvent('folderModels', folder); folderModels.value = folder})">Import</a>
				        <input id="folderModels" type="text" placeholder="Model Path" name="text" value="${
                  this.features.folderModels.value
                }" oninput="window.tools.triggerEvent('folderModels', this.value)"/>
							</div>`;
          },
        },
      };
    }

    triggerEvent(key, val, store = true) {
      val = val == undefined ? null : val;
      if (val != null && store) config.set(`tools_${key}`, val);
      if (Object.keys(this.features).includes(key)) {
        if (val != null && this.features[key].value != undefined) {
          this.features[key].value = val;
          gameWindow.webContents.executeJavaScript(
            `window.tools.features.${key}.value = JSON.parse('${JSON.stringify(val)}')`
          );
        }
        if (this.features[key].menu) this.features[key].menu(val);
        if (this.features[key].preload)
          gameWindow.webContents.executeJavaScript(
            `window.tools.features.${key}.preload(JSON.parse('${JSON.stringify(val)}'))`
          );
      }
    }

    clipboardCopy(text) {
      var temp = document.createElement("textarea");
      temp.value = text;
      temp.style.zIndex = "-1";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      document.body.removeChild(temp);
    }

    sendMessage(text) {
      chatInput.value = text;
      chatInput.focus();
      window.pressButton(13);
      chatInput.blur();
    }

    async openFolder() {
      let res = await dialog.showOpenDialog(menuWindow, { properties: ["openDirectory"] });
      if (res.cancelled) return;
      const folder = res.filePaths[0].replace(/\\/g, "/");
      return folder;
    }

    listenServerURL() {
      gameWindow.webContents.on("did-navigate-in-page", (_, url) => {
        if (CONSTS.GAME_URL.exec(url) && url.includes("?")) {
          serverURL.innerText = url;
        }
      });
    }

    listenIPC() {
      ipcRenderer.on("esc", (_) => {
        document.exitPointerLock();
      });
      ipcRenderer.on("quick-search", (_) => {
        this.searchMatch();
      });
    }

    searchMatch() {
      const filter = {
        region: config.get("tools_region", "any"),
        mode: config.get("tools_mode", "any"),
        map: config.get("tools_map", "any"),
        type: config.get("tools_type", "any"),
        minPlayers: config.get("tools_minPlayersSlider", 0),
        maxPlayers: config.get("tools_maxPlayersSlider", 8),
      };

      console.log(filter);

      this.sendStatus("searchMatchStatus", "Searching...", "neutral");

      //[game_code, region_code, min, max, {"i": "mode_map", "v": "8BdtI","cs":is_custom}]
      fetch("https://matchmaker.krunker.io/game-list?hostname=" + location.hostname)
        .then((data) => data.json())
        .then((json) => {
          const matches = json.games.filter((match) => {
            return (
              (filter.region == "any" ? true : match[1] == filter.region) &&
              match[2] >= filter.minPlayers &&
              match[2] <= filter.maxPlayers &&
              (filter.mode == "any" ? true : match[4].i.includes(filter.mode)) &&
              (filter.map == "any" ? true : match[4].i.includes(filter.map)) &&
              (filter.type == "any" ? true : match[4].cs == (filter.type == "custom"))
            );
          });
          if (matches.length > 0) {
            this.sendStatus("searchMatchStatus", "Match Found", "good");
            const randomMatch = matches[Math.floor(Math.random() * matches.length)];
            location.href = "https://krunker.io/?game=" + randomMatch[0] + "&n=" + new Date().getTime();
          } else {
            this.sendStatus("searchMatchStatus", "No Matches Found", "bad");
            if (config.get("tools_autoSearch", false)) {
              this.searchMatch();
            } else {
              menuAlert("No Matches Found :(");
            }
          }
        });
    }

    sendStatus(elName, msg = " ", status = "neutral", timeout = null) {
      menuWindow.webContents
        .executeJavaScript(
          `
				${elName}.style.color = "${status == "good" ? "green" : status == "neutral" ? "orange" : "red"}";
				${elName}.innerText = "${msg}";
			`
        )
        .then(() => {
          if (timeout) {
            setTimeout(() => {
              menuWindow.webContents.executeJavaScript(`
							${elName}.innerText = " ";
						`);
            }, timeout);
          }
        });
    }

    resetSearchMatchMsg() {
      //Use document in case menu hasnt loaded on initial start => will return null
      menuWindow.webContents.executeJavaScript(`
				intv = setInterval(_ => {
					let elem = document.getElementById('searchMatchStatus');
					if (elem) {
						elem.innerText = " ";
						clearInterval(intv);
					}
				}, 100);
			`);
    }

    observe(el, attr, callback) {
      const options = attr == "childList" ? { childList: true } : { attributes: true, attributeFilter: [attr] };
      return new MutationObserver((mutations) => {
        callback(mutations[0].target);
      }).observe(el, options);
    }

    drawWatermark() {
      const el = document.createElement("div");
      el.innerText = "Krunker Client v" + remote.app.getVersion();
      el.style.cssText = `
	        	font-size: 8pt;
	        	color: black;
	        	opacity: 0.1;
	        	background-color: white;
	        	z-index: 1000;
	        	bottom: 0;
	        	right: 0;
	        	margin: auto;
	        	position: absolute;
	        `;
      document.body.appendChild(el);
    }

    drawKillCounter() {
      killsIcon.src = url.format({
        pathname: path.join(dirname, "../img/kill.png"),
        protocol: "file:",
        slashes: true,
      });
    }

    drawDeathCounter() {
      deathsIcon.src = url.format({
        pathname: path.join(dirname, "../img/death.png"),
        protocol: "file:",
        slashes: true,
      });
    }

    drawKPalTheme(sheet) {
      if (!config.get("tools_theme", false)) return;

      const modifyRule = (query, property, value, priority) => {
        let rule = Object.values(sheet.rules).find((r) => {
          return r.selectorText ? r.selectorText == query : false;
        });
        if (rule) {
          rule.style.setProperty(property, value, priority);
        }
      };

      modifyRule(".button", "background-color", "#333");
      modifyRule(".buttonR", "background-color", "#333");
      modifyRule(".buttonG", "background-color", "#333");
      modifyRule(".buttonP", "background-color", "#333");

      modifyRule(".button", "box-shadow", "inset 0 -7px 0 0 #222");
      modifyRule(".buttonR", "box-shadow", "inset 0 -7px 0 0 #222");
      modifyRule(".buttonG", "box-shadow", "inset 0 -7px 0 0 #222");
      modifyRule(".buttonP", "box-shadow", "inset 0 -7px 0 0 #222");

      modifyRule(".button", "color", "#ff4747");
      modifyRule(".buttonR", "color", "#ff47b7", "important");
      modifyRule(".buttonP", "color", "#b447ff", "important");

      modifyRule(".sliderVal", "background-color", "#ff4747");
      modifyRule("input:checked + .slider", "background-color", "#ff4747");
      modifyRule(".sliderM::-webkit-slider-thumb", "background-color", "#ff4747");
      modifyRule(".hostPresetBtn", "background-color", "#ff4747");
      modifyRule(".mapLoadButton", "background-color", "#ff4747");
      modifyRule(".xpBarB", "background-color", "#ff4747");
      modifyRule(".accountButton", "background-color", "#ff4747");
      modifyRule(".terms", "color", "#ff4747");
      modifyRule("a", "color", "#ff4747");
      modifyRule("a:visited", "color", "#ff4747");
      modifyRule(".button.btnRespin", "color", "#ff47b7", "important");
      modifyRule(".button.btnRespin", "background-color", "#333");
      modifyRule(".joinQueue", "background-color", "#ff4747");
      modifyRule(".joinQueue", "box-shadow", "inset 0 -7px 0 0 #cf3c3c");
      modifyRule(".joinQueue:hover", "box-shadow", "inset 0 -7px 0 0 #cf3c3c");

      modifyRule(".headerBar div", "color", null);
      modifyRule(".menuItem:hover", "background", "#ff4747");
      modifyRule(".strmViews", "color", "#ff4747");
      modifyRule("#serverSearch, #settingSearch", "background-color", "#333");

      modifyRule(".settingsHeader", "background-color", "#333");
      modifyRule(".serverHeader", "background-color", "#333");
      modifyRule(".quickJoin", "background-color", "#ff4747");

      modifyRule("#page", "background-color", "#333");
      modifyRule("#menuWindow", "background-color", "#333");
      modifyRule("#menuWindow", "box-shadow", "#222 0px 9px 0px 0px");
      modifyRule("#bodyBorder", "border", "8px solid #242424");
      modifyRule(".settName", "color", "rgba(255,255,255,.5)");
      modifyRule(".settName, .settNameSmall", "color", "rgba(255,255,255,.5)");
      modifyRule(".b", "color", "rgba(255,255,255,.8)");
      modifyRule("*", "color", "#eee");
      modifyRule("input", "background-color", "#222", "important");
      modifyRule("input", "border-color", "#222", "important");
      modifyRule(".inputGrey2", "background", "#222");
      modifyRule(".inputGrey", "background", "#222");
      modifyRule(".formInput", "background", "#222");
      modifyRule("::-webkit-scrollbar", "background-color", null);
      modifyRule("::-webkit-scrollbar-track", "background-color", "#222");
      modifyRule("::-webkit-scrollbar-thumb", "background-color", "#444");
      modifyRule(".slider", "background-color", "#222");

      modifyRule(".hostToggle", "background", "#ff4747");

      sheet.insertRule("::placeholder { color: rgba(255, 255, 255, 0.2) }", 0);
      sheet.insertRule("#presetSelect { background-color: #222 !important }", 0);
    }

    capFrameRate(fpsLimit) {
      fpsInterval = fpsLimit < 10 ? 0 : 1000 / fpsLimit;
    }

    setupFrameRateCap() {
      var start = 0;
      var raf = window.requestAnimationFrame;

      this.capFrameRate(config.get("tools_fpsCapSlider", 0));

      window.requestAnimationFrame = function (...args) {
        while (window.performance.now() - start < fpsInterval);
        start = window.performance.now();
        raf(...args);
      };
    }

    genObservers() {
      //Discord RPC
      this.observe(inGameUI, "style", (e) => {
        if (e.style.display == "block") {
          ipcRenderer.send(
            "game-info",
            JSON.stringify({
              username: localStorage.krunker_username ? localStorage.krunker_username : "Guest",
              class: menuClassName.innerText,
              mode: curGameInfo.innerText.split("on")[0],
              map: mapInfo.innerText,
              time: timerVal.innerText,
            })
          );
        }
      });
      this.observe(endUI, "style", (e) => {
        if (e.style.display != "none") {
          ipcRenderer.send("idle");
        }
      });

      //Auto-Search
      this.observe(instructions, "childList", (e) => {
        if (this.features.autoSearch.value) {
          if (e.innerText.includes("Game is full.") || e.innerText.includes("NoAvailableServers")) {
            this.searchMatch();
          }
        }
      });
      this.observe(endTimer, "childList", (e) => {
        if (this.features.autoSearch.value) {
          if (e.innerText.endsWith("01")) {
            this.searchMatch();
          }
        }
      });
    }

    preload() {
      this.drawWatermark();
      // this.drawKillCounter();
      // this.drawDeathCounter();
      this.setupFrameRateCap();
      this.drawKPalTheme(document.styleSheets[0]);
      this.resetSearchMatchMsg();
      this.listenIPC();
      this.genObservers();
    }

    menu(sheet) {
      this.drawKPalTheme(sheet);
      this.listenServerURL();
      return [
        "",
        Object.keys(this.features)
          .map((k) => this.features[k].html())
          .join(""),
      ];
    }
  }

  return Tools;
};

//Menu Entry
module.exports.menu = (electron, config, dirname) => {
  toolsMenu(electron, config, dirname);
};

const toolsMenu = (electron, config, dirname) => {
  const Tools = tools(electron, config, dirname);
  window.tools = new Tools("menu");
  const html = window.tools.menu(window.document.styleSheets[0]);
  header.innerHTML = html[0];
  page.innerHTML = html[1];
};

//Preload Entry
module.exports.preload = (electron, config, dirname) => {
  toolsPreload(electron, config, dirname);
};

const toolsPreload = (electron, config, dirname) => {
  const document = window.document;
  const { ipcRenderer } = electron;
  const Tools = tools(electron, config, dirname);
  window.OffCliV = true;
  window.tools = new Tools("preload");

  const changePlayerListHotKey = (_) => localStorage.setItem("cont_listKey", 113);
  changePlayerListHotKey();

  window.prompt = (text) => ipcRenderer.sendSync("prompt", { type: "text", data: text });

  const initDiscordRPC = (_) => {
    if (CONSTS.GAME_URL.exec(location.href)) ipcRenderer.send("idle");
    if (CONSTS.SOCIAL_URL.exec(location.href)) ipcRenderer.send("social");
    if (CONSTS.EDITOR_URL.exec(location.href)) ipcRenderer.send("editor");
    if (CONSTS.VIEWER_URL.exec(location.href)) ipcRenderer.send("viewer");
  };

  const fixMenuIcons = (_) => {
    [...document.querySelectorAll(".menuItemIcon")].forEach((el) => (el.style.height = "60px"));
  };

  document.addEventListener("DOMContentLoaded", (_) => {
    initDiscordRPC();

    if (
      CONSTS.SOCIAL_URL.exec(location.href) ||
      CONSTS.EDITOR_URL.exec(location.href) ||
      CONSTS.VIEWER_URL.exec(location.href)
    ) {
      window.onbeforeunload = null;
    } else if (CONSTS.GAME_URL.exec(location.href)) {
      fixMenuIcons();
      window.tools.preload();
    }
  });
};

//Main Entry
module.exports.main = (electron, localshortcut, autoUpdater, config, DiscordRPC, dirname) => {
  clientSession(electron, localshortcut, autoUpdater, config, DiscordRPC, dirname);
};

const clientSession = (electron, localshortcut, autoUpdater, config, DiscordRPC, dirname) => {
  const { app, BrowserWindow, ipcMain, shell, Menu } = electron;

  DiscordRPC.register(CONSTS.CLIENT_ID);
  const rpc = new DiscordRPC.Client({ transport: "ipc" });
  const time = new Date();

  new (class ClientSession {
    constructor() {
      this.splashWindow = null;
      this.gameWindow = null;
      this.menuWindow = null;
      this.promptWindow = null;

      this.setAppSwitches();
      this.initDiscordRPC();

      ["SIGTERM", "SIGHUP", "SIGINT", "SIGBREAK"].forEach((signal) => {
        process.on(signal, (_) => {
          app.quit();
        });
      });

      app.on("ready", (_) => this.initSplashWindow());
      app.on("activate", (_) => {
        if (!this.splashWindow || !this.gameWindow || !this.menuWindow) this.initSplashWindow();
      });

      app.on("window-all-closed", (_) => app.quit());
      app.on("before-quit", (_) => {
        localshortcut.unregisterAll();
        this.gameWindow.close();
      });
    }

    start() {
      this.initPromptWindow();
      this.initGameWindow();
      this.initSocialWindow();
      this.initMenuWindow();
      this.initKeybinds();
    }

    setAppSwitches() {
      if (!config.get("tools_vsync", false)) {
        app.commandLine.appendSwitch("disable-frame-rate-limit");
        if (CONSTS.AMD_CPU) {
          app.commandLine.appendSwitch("disable-zero-copy");
          app.commandLine.appendSwitch("ui-disable-partial-swap");
        }
      }
      if (config.get("tools_d3d9", false)) {
        app.commandLine.appendSwitch("use-angle", "d3d9");
        app.commandLine.appendSwitch("enable-webgl2-compute-context");
        app.commandLine.appendSwitch("renderer-process-limit", 100);
        app.commandLine.appendSwitch("max-active-webgl-contexts", 100);
      }
      app.commandLine.appendSwitch("force-color-profile", config.get("tools_colorProfile", "default"));
      app.commandLine.appendSwitch("disable-http-cache");
      app.commandLine.appendSwitch("ignore-gpu-blacklist");
    }

    initSplashWindow() {
      this.splashWindow = new BrowserWindow({
        width: 700,
        height: 300,
        frame: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        show: false,
        transparent: true,
        webPreferences: {
          nodeIntegration: true,
        },
      });

      this.splashWindow.setMenu(null);
      this.splashWindow.loadURL(
        url.format({
          pathname: path.join(dirname, "../html/splash.html"),
          protocol: "file:",
          slashes: true,
        })
      );
      this.splashWindow.once("ready-to-show", (_) => {
        this.splashWindow.show();
        if (CONSTS.DEBUG) this.splashWindow.webContents.webContents.openDevTools({ mode: "undocked" });
        this.checkForUpdates();
      });
    }

    initGameWindow() {
      this.gameWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        show: false,
        menu: null,
        webPreferences: {
          webSecurity: false,
          nodeIntegration: false,
          preload: path.join(dirname, "preload.js"),
        },
      });
      this.gameWindow.setMenu(null);
      this.gameWindow.loadURL("https://krunker.io", CONSTS.NO_CACHE);

      this.gameWindow.once("ready-to-show", (_) => {
        this.splashWindow.close();
        this.gameWindow.show();
        if (CONSTS.DEBUG) this.gameWindow.webContents.webContents.openDevTools({ mode: "undocked" });
      });

      const modelsFolder = config.get("tools_folderModels", "");
      const modelsData = { filter: { urls: [] }, files: {} };

      const readFolder = (dir, useAssets = true) => {
        const readFolderAssist = (dir, root) => {
          fs.readdirSync(dir).forEach((file) => {
            const fullPath = `${dir}/${file}`;
            if (fs.statSync(fullPath).isDirectory()) {
              readFolderAssist(fullPath, root);
            } else {
              const krURL = `*://${useAssets ? "assets." : ""}krunker.io${fullPath.replace(root, "")}*`;
              if (!modelsData.filter.urls.includes(krURL)) {
                modelsData.filter.urls.push(krURL);
                modelsData.files[krURL.replace(/\*/g, "")] = url.format({
                  pathname: fullPath,
                  protocol: "file:",
                  slashes: true,
                });
              }
            }
          });
        };
        readFolderAssist(dir, dir);
      };

      if (modelsFolder.length > 0 && config.get("tools_customModels", false)) {
        readFolder(modelsFolder);
      }
      if (config.get("tools_theme", false)) {
        readFolder(path.join(dirname, "../img/theme"), false);
      }

      if (modelsData.filter.urls.length > 0) {
        this.gameWindow.webContents.session.webRequest.onBeforeRequest(modelsData.filter, (data, callback) => {
          callback({
            cancel: false,
            redirectURL: modelsData.files[data.url.replace(/https|http|(\?.*)|(#.*)/gi, "")] || data.url,
          });
        });
      }

      const navClosure = (event, url) => {
        event.preventDefault();
        if (CONSTS.SOCIAL_URL.exec(url) || CONSTS.EDITOR_URL.exec(url) || CONSTS.VIEWER_URL.exec(url)) {
          this.socialWindow.loadURL(url, CONSTS.NO_CACHE);
        } else if (CONSTS.GAME_URL.exec(url)) {
          this.gameWindow.loadURL(url, CONSTS.NO_CACHE);
        } else {
          shell.openExternal(url);
        }
      };
      this.gameWindow.webContents.on("will-navigate", navClosure);
      this.gameWindow.webContents.on("new-window", navClosure);

      this.gameWindow.on("focus", (_) => {
        if (this.menuWindow) this.menuWindow.hide();
      });
      this.gameWindow.on("closed", (_) => {
        this.gameWindow = null;
      });

      if (process.platform == "darwin") {
        const template = [
          {
            label: "Application",
            submenu: [
              { label: "About Application", selector: "orderFrontStandardAboutPanel:" },
              { type: "separator" },
              { label: "Quit", accelerator: "Command+Q", click: (_) => app.quit() },
            ],
          },
          {
            label: "Edit",
            submenu: [
              { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
              { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
              { type: "separator" },
              { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
              { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
              { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
              { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" },
            ],
          },
        ];
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
      }
    }

    initSocialWindow() {
      this.socialWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        menu: null,
        parent: this.gameWindow,
        webPreferences: {
          webSecurity: false,
          nodeIntegration: false,
        },
      });
      this.socialWindow.setMenu(null);

      this.socialWindow.once("ready-to-show", (_) => {
        this.socialWindow.show();
        if (CONSTS.DEBUG) this.socialWindow.webContents.webContents.openDevTools({ mode: "undocked" });
      });

      const navClosure = (event, url) => {
        event.preventDefault();
        if (CONSTS.SOCIAL_URL.exec(url) || CONSTS.EDITOR_URL.exec(url) || CONSTS.VIEWER_URL.exec(url)) {
          this.socialWindow.loadURL(url, CONSTS.NO_CACHE);
        } else if (CONSTS.GAME_URL.exec(url)) {
          this.gameWindow.loadURL(url, CONSTS.NO_CACHE);
        } else {
          shell.openExternal(url);
        }
      };
      this.socialWindow.webContents.on("will-navigate", navClosure);
      this.socialWindow.webContents.on("new-window", navClosure);

      this.socialWindow.on("focus", (_) => {
        if (this.menuWindow) this.menuWindow.hide();
      });
      this.socialWindow.on("closed", (_) => {
        this.socialWindow = null;
      });
    }

    initMenuWindow() {
      this.menuWindow = new BrowserWindow({
        width: 700,
        height: 500,
        frame: false,
        skipTaskbar: true,
        resizable: false,
        movable: false,
        show: false,
        transparent: true,
        parent: this.gameWindow,
        webPreferences: {
          nodeIntegration: true,
        },
      });
      this.menuWindow.setMenu(null);
      this.menuWindow.loadURL(
        url.format({
          pathname: path.join(dirname, "../html/menu.html"),
          protocol: "file:",
          slashes: true,
        })
      );

      this.menuWindow.once("ready-to-show", (_) => {
        if (CONSTS.DEBUG) this.menuWindow.webContents.webContents.openDevTools({ mode: "undocked" });
      });
      this.menuWindow.on("closed", (_) => {
        this.menuWindow = null;
      });
    }

    initPromptWindow() {
      let response;

      ipcMain.on("prompt", (event, opt) => {
        response = null;

        this.promptWindow = new BrowserWindow({
          width: 300,
          height: 157,
          show: false,
          frame: false,
          skipTaskbar: true,
          alwaysOnTop: true,
          resizable: false,
          movable: false,
          center: true,
          transparent: true,
          webPreferences: {
            nodeIntegration: true,
          },
        });

        this.promptWindow.loadURL(
          url.format({
            pathname: path.join(dirname, "../html/prompt.html"),
            protocol: "file:",
            slashes: true,
          })
        );
        if (CONSTS.DEBUG) this.promptWindow.webContents.openDevTools({ mode: "undocked" });

        this.promptWindow.webContents.on("did-finish-load", () => {
          this.promptWindow.show();
          this.promptWindow.webContents.send("text", JSON.stringify(opt));
        });

        this.promptWindow.on("closed", () => {
          event.returnValue = response;
          this.promptWindow = null;
        });
      });
      ipcMain.on("prompt-response", (event, args) => {
        response = args === "" ? null : args;
      });
    }

    initKeybinds() {
      [
        {
          key: "Esc",
          event: (_) => {
            this.gameWindow.webContents.send("esc");
          },
        },
        {
          key: "F3",
          event: (_) => {
            this.gameWindow.webContents.send("quick-search");
          },
        },
        {
          key: "F4",
          event: (_) => {
            this.gameWindow.loadURL("https://krunker.io", CONSTS.NO_CACHE);
          },
        },
        {
          key: "F5",
          event: (_) => {
            this.gameWindow.reload();
          },
        },
        {
          key: "F11",
          event: (_) => {
            this.gameWindow.setFullScreen(!this.gameWindow.isFullScreen());
          },
        },
        {
          key: "Alt+F4",
          event: (_) => {
            app.quit();
          },
        },
        {
          key: config.get("tools_keybind", "Tab"),
          event: (_) => {
            if (!this.menuWindow.isVisible() && this.gameWindow.isVisible()) {
              this.menuWindow.show();
            } else {
              this.menuWindow.hide();
              this.gameWindow.focus();
            }
          },
        },
      ].forEach((b) => {
        try {
          localshortcut.register(b.key, b.event);
        } catch (e) {
          console.log("Invalid Keybind");
          config.set("tools_keybind", "Tab");
          localshortcut.register("Tab", b.event);
        }
      });
    }

    checkForUpdates() {
      if (CONSTS.DEBUG || process.platform == "darwin") return this.start();
      [
        {
          hook: "download-progress",
          event: (e) => {
            this.splashWindow.webContents.send("download-progress", Math.floor(e.percent));
          },
        },
        {
          hook: "update-available",
          event: (e) => {
            this.splashWindow.webContents.send("update-available");
          },
        },
        {
          hook: "update-downloaded",
          event: (e) => {
            autoUpdater.quitAndInstall();
          },
        },
        {
          hook: "error",
          event: (e) => {
            splashWindow.webContents.send("error", e.toString());
          },
        },
      ].forEach((b) => {
        autoUpdater.on(b.hook, b.event);
      });
      [
        {
          hook: "update-not-available",
          event: (e) => {
            this.splashWindow.webContents.send("update-not-available");
            this.start();
          },
        },
      ].forEach((b) => {
        autoUpdater.once(b.hook, b.event);
      });
      autoUpdater.checkForUpdates();
    }

    initDiscordRPC() {
      const getSeconds = (timeText) => {
        let tokens = timeText.split(":").map((x) => parseInt(x));
        return tokens[0] * 60 + tokens[1];
      };

      const imageKey = (className) => {
        return className.replace(/\s/g, "_").toLowerCase();
      };

      ipcMain.on("game-info", (event, text) => {
        var info = JSON.parse(text);
        time.setTime(Date.now() + getSeconds(info.time) * 1000);
        rpc.setActivity({
          details: info.map.split("_")[1],
          state: `Playing ${info.mode}`,
          largeImageKey: "logo",
          largeImageText: info.username,
          smallImageKey: imageKey(info.class),
          smallImageText: info.class,
          endTimestamp: time,
          partyId: "krunker",
          joinSecret: this.gameWindow.webContents.getURL(),
        });
      });

      ["idle", "social", "editor", "viewer"].forEach((o) => {
        ipcMain.on(o, (event) => {
          time.setTime(Date.now());
          rpc.setActivity({
            state: o[0].toUpperCase() + o.substring(1),
            largeImageKey: "logo",
            startTimestamp: time,
          });
        });
      });

      rpc.on("ready", (_) => {
        rpc.on("RPC_MESSAGE_RECEIVED", (event) => {
          console.log(event);
        });
        rpc.subscribe("ACTIVITY_JOIN_REQUEST", (user) => {
          console.log("user");
        });
        rpc.subscribe("ACTIVITY_JOIN", ({ secret }) => {
          this.gameWindow.loadURL(secret, CONSTS.NO_CACHE);
        });
      });
      rpc.login({ clientId: CONSTS.CLIENT_ID }).catch(console.error);
    }
  })();
};
