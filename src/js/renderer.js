window.onload = () => {
    window.Settings = require("../json/setting.json");
    const { ipcRenderer } = require("electron");

    var isAppendTags = false;
    var clicked = {
        setting: false,
        tools: false
    }

    var model = null;

    const init = () => {
        return new Promise((resolve, reject) => {
            Promise.all([
                loadResourse("../js/main.js", "js"),
                loadResourse("../css/style.css", "css"),
            ]).then(() => {
                const Htmls = {
                    tools: `<div id="camera" class="ctrl tools tag"></div>`,
                    setting: `
                        <div id="magnifier" class="ctrl setting tag"></div>
                        <div id="append" class="ctrl setting tag"></div>
                        <div id="hidden" class="ctrl setting tag"></div>
                        <div id="close" class="ctrl setting tag"></div>`
                }

                setTimeout(() => {
                    let rate = 0.5;
                    let oldRate = rate;

                    document.querySelectorAll(".main").forEach((ele) => {
                        ele.style.width = `${Settings.MoveImg.Width}px`;
                        ele.style.height = `${Settings.MoveImg.Height}px`;
                        ele.style.top = `${Settings.MoveImg.Height * rate}px`;
                        ele.style.right = `${Settings.MoveImg.Width / 2}px`;

                        switch (ele.id) {
                            case "setting":
                                ele.onclick = () => {
                                    if (clicked.setting) {
                                        ele.style.animationName = "none";
                                        ele.style.animationDuration = "none";
                                        ele.style.animationTimingFunction = "none"
                                        ele.style.animationIterationCount = "none";

                                        onTagChange("");
                                        isAppendTags = false;
                                        clicked.setting = false;
                                    } else if (!isAppendTags) {
                                        ele.style.animationName = "setting";
                                        ele.style.animationDuration = "2s";
                                        ele.style.animationTimingFunction = "linear"
                                        ele.style.animationIterationCount = "infinite";

                                        onTagChange(Htmls.setting);
                                        isAppendTags = true;
                                        clicked.setting = true;
                                    }
                                }
                                break;
                            case "tools":
                                ele.onclick = () => {
                                    if (clicked.tools) {
                                        onTagChange("");
                                        isAppendTags = false;
                                        clicked.tools = false;
                                    } else if (!isAppendTags) {
                                        onTagChange(Htmls.tools);
                                        isAppendTags = true;
                                        clicked.tools = true;
                                    }
                                }
                        }

                        rate += 1.25;
                        oldRate = rate;
                    });

                    const onTagChange = (html) => {
                        let rate = oldRate;
                        // 清空

                        //document.querySelectorAll(".main").forEach(ele => {
                        //    ele.innerHTML = "";
                        //});

                        document.getElementById("box").innerHTML = html;

                        document.querySelectorAll(".tag").forEach((ele) => {
                            ele.style.width = `${Settings.MoveImg.Width}px`;
                            ele.style.height = `${Settings.MoveImg.Height}px`;
                            ele.style.top = `${Settings.MoveImg.Height * rate}px`;
                            ele.style.right = `${Settings.MoveImg.Width / 2}px`;
                            ele.className += " select";

                            switch (ele.id) {
                                case "camera":
                                    //ele.onclick = () => syncCamera();
                                    break;
                                case "magnifier":
                                    //ele.onclick = () => enlarge();
                                    break;
                                case "append":
                                    //ele.onclick = () => append();
                                    break;
                                case "hidden":
                                    ele.onclick = () => {
                                        ipcRenderer.send(Settings.IpcEvent.Hidden, Settings.List["MainWindow"]);
                                    }
                                    break;
                                case "close":
                                    ele.onclick = () => {
                                        ipcRenderer.send(Settings.IpcEvent.Close, Settings.List["MainWindow"]);
                                    }
                                    break;
                            }
                            rate += 1.25;
                        });
                    }

                    let hover, out;
                    window.onmouseover = () => {
                        hover = setTimeout(() => {
                            if (out) clearTimeout(out);
                            document.getElementById("move").style.opacity = "1";
                            document.querySelectorAll(".main").forEach(ele => {
                                ele.style.display = "block";
                            });
                        }, 1);
                    };
                    window.onmouseout = () => {
                        out = setTimeout(() => {
                            if (isAppendTags) return;
                            if (hover) clearTimeout(hover);
                            document.getElementById("move").style.opacity = "0";
                            document.querySelectorAll(".main").forEach(ele => {
                                ele.style.display = "none";
                            });
                        }, 3000);
                    };
                }, 0);

                resolve();
            }).catch(err => reject(err));
        });
    }

    const loadResourse = (url, type) => {
        return new Promise((resolve, reject) => {
            let tag;

            if (type === "css") {
                tag = document.createElement("link");
                tag.rel = "stylesheet";
                tag.href = url;
            } else if (type === "js") {
                tag = document.createElement("script");
                tag.src = url;
            }

            if (tag) {
                tag.onload = () => resolve(url);
                tag.onerror = () => reject(url);
                document.head.appendChild(tag);
            }
        });
    }

    const append = () => {
        ipcRenderer.send(IpcEvenst.Append, Settings.List["SettingWindow"]);
    }
    /*
    const InitGragFile = (app) => {
        const handle = {
            "img": (files) => {
                let filters = ["jpg", "png", "svg", "ico"];
                let f = false;
                filters.forEach(fil => {
                    if (files[0].path.endsWith("." + fil)) {
                        f = files[0];
                    }
                });
                return f;
            },
            "mp4": (files) => {
                if (files[0].path.endsWith(".mp4")) {
                    return files[0];
                }
                return false;
            },
            "mp3": (files) => {
                let f = [];
                for (let i = 0; i < files.length; i++) {
                    f.push({
                        name: files[i].name,
                        path: files[i].path
                    });
                }
                f = f.filter(sf => sf.path.endsWith(".mp3"));
                return f.length > 0 ? f : false;
            }
            // e.dataTransfer.files[0].path
        }
        window.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            return false;
        };

        window.ondrop = (e) => {
            e.preventDefault();
            let img = null;
            let mp4 = null;
            if (e.dataTransfer.files.length == 1) {
                img = handle["img"](e.dataTransfer.files);
                mp4 = handle["mp4"](e.dataTransfer.files);
            }
            let mp3 = handle["mp3"](e.dataTransfer.files);

            if (mp3) return ipcRenderer.send(IpcEvenst.MusicStart, mp3);

            if (img) {
                let sprite = PIXI.Sprite.from(img.path)
                app.stage.addChild(sprite);
                sprite.x = Model[MsODELNAME].Canvas.Width * 0.5;
                sprite.y = Model[MsODELNAME].Canvas.Height * 0.7;
                sprite.anchor.set(0.5, 0);
                app.stage.sortChildren();
                // enableDragImg(sprite);
            }
            if (mp4) {

            }
            return false;
        };

        window.ondragleave = () => {
            return false;
        };
    }*/



    (async () => {
        console.log("init renderer.js");
        await init();
       
       // InitGragFile();
    })();
}



