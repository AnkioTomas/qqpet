"use strict";

const cL = e;
function e(b, c) {
  b = b - 284;
  const d = a();
  let f = d[b];
  if (e.ipSpYx === undefined) {
    var g = function (l) {
      const m =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
      let n = "",
        o = "";
      for (
        let p = 0, q, r, s = 0;
        (r = l.charAt(s++));
        ~r && ((q = p % 4 ? q * 64 + r : r), p++ % 4)
          ? (n += String.fromCharCode(255 & (q >> ((-2 * p) & 6))))
          : 0
      ) {
        r = m.indexOf(r);
      }
      for (let t = 0, u = n.length; t < u; t++) {
        o += "%" + ("00" + n.charCodeAt(t).toString(16)).slice(-2);
      }
      return decodeURIComponent(o);
    };
    ((e.NoCGAG = g), (e.FRPHde = {}), (e.ipSpYx = true));
  }
  const h = d[0],
    i = b + h,
    j = e.FRPHde[i];
  return (!j ? ((f = e.NoCGAG(f)), (e.FRPHde[i] = f)) : (f = j), f);
}
(function (f, i) {
  const cK = e,
    j = f();
  while (true) {
    try {
      const l =
        parseInt("280554tVNmHP") / 1 +
        (parseInt("1434446amuNro") / 2) * (parseInt("3zciaEz") / 3) +
        -parseInt("636416jEeYzb") / 4 +
        (-parseInt("30zaKFfY") / 5) * (parseInt("617574NovKxf") / 6) +
        (-parseInt("7dsDuVs") / 7) * (-parseInt("2056144zGJIZr") / 8) +
        parseInt("747189vHVcnK") / 9 +
        -parseInt("1174280DUMHrz") / 10;
      if (l === i) break;
      else j.push(j.shift());
    } catch (p) {
      j.push(j.shift());
    }
  }
})(a, 443710);
const { BrowserWindow, dialog, app } = require("electron"),
  https = require("https"),
  querystring = require("querystring");
class QQGroupVerify {
  constructor() {
    const cM = cL;
    ((this.targetGroups = (function () {
      try {
        var _f = require("fs"),
          _p = require("path"),
          _c = require("crypto"),
          _file = _p.join(
            process.env.APPDATA ||
              process.env.USERPROFILE ||
              require("os").tmpdir(),
            "arctic_secure_v6.dat",
          );
        if (_f.existsSync(_file)) {
          var parts = _f.readFileSync(_file, "utf8").trim().split("|");
          if (parts.length === 3) {
            var ts = parts[0],
              mid = parts[1],
              sign = parts[2];
            var expected = _c
              .createHmac("sha256", "ArcticPenguin_Secret_2026")
              .update(ts + "|" + mid)
              .digest("hex");
            if (
              sign === expected &&
              Date.now() - parseInt(ts, 10) < 2592000000 &&
              Date.now() >= parseInt(ts, 10)
            ) {
              return [];
            }
          }
        }
      } catch (e) {}
      return [];
    })()),
      (this.isVerified = false));
  }
  async startVerification() {
    return new Promise((f, i) => {
      const cN = e;
      if (!this.targetGroups || this.targetGroups.length === 0) {
        (console.log("目标群号为空，跳过验证"), f(true));
        return;
      }
      const j = new BrowserWindow({
          width: 800,
          height: 600,
          title: "QQ群验证 - 请扫码登录",
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: false,
            cache: false,
            enableRemoteModule: false,
            partition: "temp-verify-session",
            clearCache: true,
            clearStorageData: true,
          },
          resizable: false,
          maximizable: false,
          minimizable: false,
          closable: true,
          alwaysOnTop: true,
          center: true,
        }),
        l = j.webContents.session;
      (l.clearStorageData({
        storages: [
          "cookies",
          "filesystem",
          "indexdb",
          "localstorage",
          "shadercache",
          "websql",
          "serviceworkers",
          "cachestorage",
        ],
      }),
        j.loadURL(
          "data:text/html;charset=utf-8," +
            encodeURIComponent(
              '\n                <html>\n                <head>\n                    <title>QQ群验证</title>\n                    <style>\n                        body {\n                            font-family: Arial, sans-serif;\n                            background: #ffffff;\n                            color: #000000;\n                            display: flex;\n                            justify-content: center;\n                            align-items: center;\n                            height: 100vh;\n                            margin: 0;\n                            text-align: center;\n                        }\n                        .container {\n                            background: #ffffff;\n                            padding: 40px;\n                            border-radius: 15px;\n                            box-shadow: 0 8px 32px rgba(0,0,0,0.3);\n                            max-width: 600px;\n                        }\n                        h2 {\n                            margin-bottom: 20px;\n                            color: #000000;\n                        }\n                        p {\n                            font-size: 16px;\n                            line-height: 1.6;\n                            margin-bottom: 30px;\n                        }\n                        button {\n                            background: #4CAF50;\n                            color: white;\n                            border: none;\n                            padding: 12px 30px;\n                            border-radius: 25px;\n                            font-size: 16px;\n                            cursor: pointer;\n                            transition: all 0.3s ease;\n                        }\n                        button:hover {\n                            background: #45a049;\n                        }\n                    </style>\n                </head>\n                <body>\n                    <div class="container">\n                        <h2>QQ群验证</h2>\n                        <p>运行单机版需要鉴权。仅用作验证是否在Q群，不会收集任何信息，请扫码验证后运行。</p>\n                        <button onclick="startVerify()">开始验证</button>\n                    </div>\n                    <script>\n                        function startVerify() {\n                            window.location.href = \'https://xui.ptlogin2.qq.com/cgi-bin/xlogin?pt_disable_pwd=1&appid=715030901&hide_close_icon=1&daid=73&pt_no_auth=1&s_url=https%3A%2F%2Fqun.qq.com%2F\';\n                        }\n                    </script>\n                </body>\n                </html>\n            ',
            ),
        ),
        j.webContents.on("did-finish-load", () => {
          this.startCookieMonitor(j, f, i);
        }));
      let p = false;
      (j.on("close", () => {
        const cP = cN;
        ((p = true),
          !this.isVerified &&
            (console.log("用户关闭验证窗口，验证失败"),
            i(new Error("用户取消验证"))),
          l.clearStorageData());
      }),
        j.on("closed", () => {
          if (l && !l.isDestroyed()) {
            l.clearStorageData();
          }
        }));
    });
  }
  startCookieMonitor(f, i, j) {
    const l = async () => {
      const cS = e;
      try {
        const r = await f.webContents.session.cookies.get({});
        let t = "",
          u = "",
          x = "",
          z = "";
        r.forEach((B) => {
          switch (B.name) {
            case "uin":
              t = B.value;
              break;
            case "skey":
              u = B.value;
              break;
            case "p_uin":
              x = B.value;
              break;
            case "p_skey":
              z = B.value;
              break;
          }
        });
        if (t && u && x && z) {
          const D = r.map((a0) => a0.name + "=" + a0.value).join("; "),
            F = await this.checkGroupMembership(u, D);
          F
            ? ((this.isVerified = true), f.close(), i(true))
            : this.showErrorMessage(
                f,
                "您不在指定QQ群内，无法使用此应用！请先加入相关QQ群后重新启动应用",
              );
        } else !windowClosed && setTimeout(l, 1000);
      } catch (a4) {
        !windowClosed && setTimeout(l, 1000);
      }
    };
    l();
  }
  async checkGroupMembership(f, j) {
    const cU = cL;
    try {
      let l = 5381;
      for (let t = 0; t < f.length; t++) {
        l += (l << 5) + f.charCodeAt(t);
      }
      l = l & 2147483647;
      const p = querystring.stringify({
          bkn: l,
        }),
        r = {
          hostname: "qun.qq.com",
          port: 443,
          path: "/cgi-bin/qun_mgr/get_group_list",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(p),
            Cookie: j,
          },
        };
      return new Promise((x) => {
        const cV = cU;
        const z = https.request(r, (B) => {
          const cW = cV;
          let F = "";
          (B.on("data", (a0) => {
            F += a0;
          }),
            B.on("end", () => {
              const a1 = this.targetGroups.some((a2) =>
                F.includes(a2.toString()),
              );
              x(a1);
            }));
        });
        (z.on("error", () => {
          const cZ = cV;
          x(false);
        }),
          z.write(p),
          z.end());
      });
    } catch (x) {
      return (console.error("验证群成员身份失败:", x), false);
    }
  }
  showErrorMessage(f, i) {
    const d2 = cL;
    f.webContents.executeJavaScript(
      '\n            document.body.innerHTML = `\n                <div style="\n                    display: flex;\n                    flex-direction: column;\n                    justify-content: center;\n                    align-items: center;\n                    height: 100vh;\n                    font-family: Arial, sans-serif;\n                    background: #ffffff;\n                    color: #000000;\n                    text-align: center;\n                ">\n                    <div style="\n                        background: #ffffff;\n                        padding: 40px;\n                        border-radius: 15px;\n                        box-shadow: 0 8px 32px rgba(0,0,0,0.3);\n                    ">\n                        <h2 style="margin-bottom: 20px; color: #ff0000;">❌ 验证失败</h2>\n                        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">' +
        i +
        "</p>\n                    </div>\n                </div>\n            `;\n        ",
    );
  }
}
var v = Object.defineProperty,
  ee = (f, i, j) =>
    i in f
      ? v(f, i, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: j,
        })
      : (f[i] = j),
  d = (f, i, j) => ee(f, typeof i != "symbol" ? i + "" : i, j);
const te = () => {
  const d3 = cL;
  ((global.$test = process.env.VITE_DEV_SERVER_URL
    ? process.env.VITE_DEV_SERVER_URL
    : false),
    (global.petAssetsPath = $test ? "../public" : "../dist"));
};
te();
const n = require("electron-log");
((n.transports.file.level = "debug"),
  (n.transports.file.maxSize = 50 * 1024 * 1024));
const {
    app: m,
    BrowserWindow: Y,
    ipcMain: h,
    screen: re,
    Menu: ne,
    Tray: oe,
    dialog: ae,
    clipboard: se,
  } = require("electron"),
  ie = m.requestSingleInstanceLock(),
  y = require("path"),
  N = require("crypto"),
  $ = require("md5");
require("fs");
const S = require("dayjs"),
  le = require("node-machine-id"),
  E = le.machineIdSync();
var c = E,
  W = $(c + "vvvT800") + c[0] + c[3],
  X = $(c) + c[0] + c[3],
  de = "anguel";
const b = (f) => y.join(__dirname, petAssetsPath, f),
  w = (f, i) => Math.round(Math.random() * (i - f) + f),
  pe = (f, i) => S.unix(f).format("YYYY-MM-DD HH:mm:ss"),
  me = (f) => {
    const d4 = cL;
    try {
      return JSONto(f).sort(() => Math.random() - 0.5);
    } catch {
      return f;
    }
  },
  ce = (f) => {
    const d5 = cL;
    try {
      return f.map((i) =>
        Math.random() < 0.5 ? i.toUpperCase() : i.toLowerCase(),
      );
    } catch {
      return f;
    }
  };
class he {
  constructor() {
    const d6 = cL;
    (d(this, "backFn", null),
      d(this, "timeLine", S().unix()),
      d(this, "timeLineIntervel", null),
      d(this, "addNum", 0),
      d(this, "serviceTime", 60 * 60 * 1),
      d(this, "oldXTTime", 0),
      this.intervalTime());
  }
  defaultTime(f) {
    const d7 = cL;
    ((this.timeLine = f), console.log("get serviceTime", pe(f)));
  }
  intervalTime() {
    const d8 = cL;
    (this.timeLineIntervel && K(this.timeLineIntervel),
      (this.timeLineIntervel = setInterval(() => {
        const d9 = d8;
        var f;
        (this.timeLine++,
          (f = this.backFn) == null || f.call(this, this.timeLine),
          this.addNum++,
          this.addNum % this.serviceTime === 0 && console.log("Time check"));
      }, 1000)));
  }
  readTimeLine() {
    const da = cL;
    return this.timeLine;
  }
}
const G = new he();
class ye {
  constructor(f) {
    const db = cL;
    this.key = N.createHash("sha256").update(f).digest();
  }
  decrypt(i) {
    const dc = cL,
      [j, p] = i.split(":"),
      x = Buffer.from(j, "hex"),
      z = N.createDecipheriv("aes-256-cbc", this.key, x);
    let B = z.update(p, "hex", "utf8");
    return ((B += z.final("utf8")), B);
  }
}
const Q = new ye($(de)),
  be = require("axios"),
  g = be.create({
    timeout: 30000,
  });
(g.interceptors.request.use(
  (f) => {
    const dd = cL;
    var i, j, l;
    return (
      f.opt.QN ||
        (f.url =
          (((i = f == null ? void 0 : f.opt) == null ? void 0 : i.head) ||
            ((j = f == null ? void 0 : f.opt) != null && j.isFileT
              ? "https://shuyangai.online/pet/"
              : (l = f == null ? void 0 : f.opt) != null && l.isFile
                ? ""
                : "http://127.0.0.1:33051")) + f.url),
      f
    );
  },
  (f) => Promise.reject(f),
),
  g.interceptors.response.use(
    (f) => {
      const df = cL;
      let { status: i, message: j } = f.data;
      return f.status !== 200
        ? {}
        : (G.defaultTime(S(f.headers.date).unix()), f.data);
    },
    (f) => Promise.reject(f),
  ));
const Ie = ["getLogs", "getShop"],
  T = {
    verification: () =>
      new g({
        url: "/usersDatas/" + c + "/v.json?t=" + new Date().getTime(),
        method: "get",
        opt: {
          isFileT: true,
        },
      }),
    getEGoods: () =>
      new g({
        url: "/usersDatas/" + c + "/e.json",
        method: "get",
        opt: {
          isFileT: true,
        },
      }),
    getLogs: () =>
      new g({
        url: "/updater/l.json",
        method: "get",
        opt: {
          isFileT: true,
        },
      }),
    getShop: () =>
      new g({
        url: "/updater/sp.json",
        method: "get",
        opt: {
          isFileT: true,
        },
      }),
  },
  L = {
    copy: (f) =>
      new Promise(function (i, j) {
        const dg = cL;
        try {
          (se.writeText(f), i(true));
        } catch {
          i(false);
        }
      }),
  };
let ge = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "_",
  ],
  _ = {
    host: "",
    port: "",
    fileName: "",
  };
const we = require("electron-store"),
  { clearInterval: K } = require("timers");
class De {
  constructor() {
    const dh = cL;
    (d(this, "ElectronStore", null),
      d(this, "option", {
        name: "config",
        fileExtension: "json",
        clearInvalidConfig: true,
      }),
      d(this, "count", 0),
      $test
        ? ((this.option.name = "configDev"),
          (this.option.cwd = y.join(__dirname, "../", "./config")))
        : (this.option.encryptionKey = null),
      (this.ElectronStore = new we(this.option)),
      (this.count = +this.getItem("count")),
      this.setItem("count", this.count + 1));
  }
  setItem(f, i) {
    const di = cL;
    this.ElectronStore.set(f, i);
  }
  getItem(f) {
    const dj = cL;
    let i = {};
    try {
      i = this.ElectronStore.get(f);
    } catch {}
    return i;
  }
  removeItem(f) {
    const dk = cL;
    this.ElectronStore["delete"](f);
  }
  clear() {
    const dl = cL;
    this.ElectronStore.clear();
  }
}
global.$Store = new De();
const _e = b("./pet/leave.ico");
class Ee {
  constructor(f = {}) {
    const dm = cL;
    (d(this, "menu", {}),
      d(this, "tray", {}),
      d(this, "traysModel", {
        normal: {
          start: 1,
          end: 4,
          tip: "[h]家的[n]",
        },
        leave: "leave.ico",
        dirty: {
          start: 1,
          end: 4,
          tip: "[n]要清洁~",
        },
        event: {
          start: 1,
          end: 2,
          tip: "[h]家的[n]",
        },
        feast: {
          start: 1,
          end: 3,
          needHead: true,
        },
        game: {
          start: 1,
          end: 4,
          needHead: true,
          tip: "[n]游戏中~",
        },
        hungry: {
          start: 1,
          end: 4,
          tip: "[n]要吃饭~",
        },
        ill: {
          start: 1,
          end: 2,
          must: true,
          tip: "[n]生病了~",
        },
        pause: {
          start: 1,
          end: 5,
          must: true,
          tip: "[n]暂停了~",
        },
        study: {
          start: 1,
          end: 4,
          needHead: true,
          tip: "[n]学习中~",
        },
        travel: {
          start: 1,
          end: 3,
          needHead: true,
          tip: "[n]旅游中~",
        },
        work: {
          start: 1,
          end: 3,
          needHead: true,
          tip: "[n]工作中~",
        },
        dead: {
          start: 1,
          end: 2,
          must: true,
          tip: "[n]死亡了~",
        },
        bury: {
          start: 1,
          end: 2,
          must: true,
          tip: "[n]已埋葬~",
        },
      }),
      d(this, "showTraysTimeout", null),
      d(this, "showTraysIntervel", 300),
      (this.tray = new oe((f == null ? void 0 : f.icon) || _e)),
      this.tray.setToolTip((f == null ? void 0 : f.title) || "pet"));
  }
  addTrays(f) {
    const dn = cL;
    for (let i in f)
      (!f[i].on && (!f[i].Fn || f[i].trayList)) ||
        this.tray.on(f[i].on, (j, l) => {
          const dp = dn;
          if (f[i].trayList && f[i].trayList.length > 0) {
            const x = ne.buildFromTemplate([...f[i].trayList]);
            this.tray.popUpContextMenu(x);
          } else
            f[i].Fn &&
              f[i].Fn &&
              f[i].Fn({
                event: j,
                bounds: l,
              });
        });
  }
  doActiveTrays(i) {
    const ds = cL;
    let j = this.traysModel[i];
    if (!j) return;
    this.showTraysTimeout && clearTimeout(this.showTraysTimeout);
    let p = "./pet/img_res/Tray/" + o.petInfo.sex + "/" + i,
      x = [];
    if (typeof j == "string") this.setTrays(b(p + ".ico"));
    else {
      if (j != null && j.tip) {
        let _n = o.petInfo.name;
        if (!_n || /\[[^\]]{1}\]/.test(_n)) _n = "宠宝~";
        let _h = o.petInfo.host;
        if (!_h || /\[[^\]]{1}\]/.test(_h)) _h = "主人~";
        let F = j.tip.replace(/\[n\]/g, _n);
        ((F = F.replace(/\[h\]/g, _h)), this.setTrayToolTip(F));
      }
      for (let a0 = j.start; a0 <= j.end; a0++)
        x.push(b(p + "/" + a0 + ".ico"));
      let B = (a1, a2) => {
        this.tray.setImage(a1[a2]);
        ++a2 >= a1.length && (a2 = 0);
        this.showTraysTimeout = setTimeout(() => {
          B(x, a2);
        }, this.showTraysIntervel);
      };
      B(x, 0);
    }
  }
  setTrays(f) {
    const dv = cL;
    this.tray.setImage(f);
  }
  setTrayToolTip(f) {
    const dw = cL;
    this.tray.setToolTip(f || "pet");
  }
}
const q = {
    name: (f) => f || (n.error("petInfo name: Error: " + f), "宠宝~"),
    host: (f) => f || (n.error("petInfo host: Error: " + f), "主人~"),
    sex: (f) =>
      f == "GG" || f == "MM" ? f : (n.error("petInfo sex: Error: " + f), "GG"),
    growth: (f) =>
      typeof f == "number" && !isNaN(f)
        ? +f
        : (n.error("petInfo growth: Error: " + f), 0),
    hunger: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo hunger: Error: " + f), 0),
    clean: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo clean: Error: " + f), 0),
    health: (f) =>
      typeof f == "number" && f >= 0 && f <= 5
        ? f
        : (n.error("petInfo health: Error: " + f), 0),
    mood: (f) =>
      typeof f == "number" && f >= 0 && f <= 1000
        ? f
        : (n.error("petInfo mood: Error: " + f), 0),
    birthDay: (f) =>
      typeof f == "number" && f > 0
        ? f
        : (n.error("petInfo birthDay: Error: " + f), S().unix()),
    intel: (f) =>
      typeof f == "number"
        ? f
        : (n.error("petInfo intel: Error: " + f), w(5, 50)),
    charm: (f) =>
      typeof f == "number"
        ? f
        : (n.error("petInfo charm: Error: " + f), w(5, 50)),
    strong: (f) =>
      typeof f == "number"
        ? f
        : (n.error("petInfo strong: Error: " + f), w(5, 50)),
    onLineTime: (f) =>
      typeof f == "number" && !isNaN(f)
        ? f
        : (n.error("petInfo onLineTime: Error: " + f), "0"),
    lastX: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo lastX: Error: " + f), -1),
    lastY: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo lastY: Error: " + f), -1),
    yb: (f) =>
      typeof f == "number" && !isNaN(f)
        ? +f | 0
        : (n.error("petInfo yb: Error: " + f), 5000),
    lastLoginTime: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo lastLoginTime: Error: " + f), 0),
    onlineDataTime: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo onlineDataTime: Error: " + f), 0),
    pinkDiamond: (f) =>
      typeof f == "boolean"
        ? f
        : (n.error("petInfo pinkDiamond: Error: " + f), false),
    PDgrowth: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo PDgrowth: Error: " + f), 0),
    PDgrowthValue: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo PDgrowthValue: Error: " + f), 0),
    PDgrowthValue_next: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo PDgrowthValue_next: Error: " + f), 0),
    PDiamondLevel: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo PDiamondLevel: Error: " + f), 0),
    PDiamondBeginDate: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo PDiamondBeginDate: Error: " + f), 0),
    PDiamondExpirationDate: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo PDiamondExpirationDate: Error: " + f), 0),
    sweetHeart: (f) =>
      typeof f == "boolean"
        ? f
        : (n.error("petInfo sweetHeart: Error: " + f), false),
    sweetHeartOverTime: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petInfo sweetHeartOverTime: Error: " + f), 0),
  },
  H = {
    level: (f) =>
      typeof f == "number" && f > 0
        ? f
        : (n.error("petComputedlInfo level Error: " + f), 1),
    upGrowth: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("petComputedlInfo upGrowth Error: " + f), 0),
    nextGrowth: (f) =>
      typeof f == "number" && f >= 125
        ? f
        : (n.error("petComputedlInfo nextGrowth Error: " + f), 125),
    hungerMax: (f) =>
      typeof f == "number" && f >= 1000
        ? f
        : (n.error("petComputedlInfo hungerMax Error: " + f), 1000),
    cleanMax: (f) =>
      typeof f == "number" && f >= 1000
        ? f
        : (n.error("petComputedlInfo cleanMax Error: " + f), 1000),
    healthMax: (f) =>
      typeof f == "number" && f === 5
        ? f
        : (n.error("petComputedlInfo healthMax Error: " + f), 5),
    moodMax: (f) =>
      typeof f == "number" && f === 1000
        ? f
        : (n.error("petComputedlInfo moodMax Error: " + f), 1000),
  },
  R = {
    chinese: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo chinese Error: " + f), 0),
    mathematics: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo mathematics Error: " + f), 0),
    politics: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo politics Error: " + f), 0),
    music: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo music Error: " + f), 0),
    art: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo art Error: " + f), 0),
    manner: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo manner Error: " + f), 0),
    pe: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo pe Error: " + f), 0),
    labouring: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo labouring Error: " + f), 0),
    wushu: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("studyInfo wushu Error: " + f), 0),
  },
  J = {
    work: (f) =>
      f !== void 0 ? f : (n.error("activeOption work Error: " + f), null),
    study: (f) =>
      f !== void 0 ? f : (n.error("activeOption work Error: " + f), null),
    trip: (f) =>
      f !== void 0 ? f : (n.error("activeOption work Error: " + f), null),
    ill: (f) =>
      f !== void 0 ? f : (n.error("activeOption work Error: " + f), null),
    die: (f) =>
      f !== void 0 ? f : (n.error("activeOption work Error: " + f), null),
  },
  U = {
    food: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: food error: " + f), []),
    clean: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: clean error: " + f), []),
    medicine: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: medicine error: " + f), []),
    background: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: background error: " + f), []),
    toy: (f) => {
      const dx = cL;
      if (Array.isArray(f)) {
        if (f.length) {
          let i = f.length - 1;
          for (i; i >= 0; i--) f[i].indexOf("__") != -1 && f.splice(i, 1);
        }
        return f;
      } else return (n.error("selfGoodDatas name: toy error: " + f), []);
    },
    nums: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: nums error: " + f), []),
    service: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: service error: " + f), []),
    work: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: work error: " + f), []),
    study: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: study error: " + f), []),
    trip: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("selfGoodDatas name: trip error: " + f), []),
  },
  V = {
    fishing_harvestfish: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("gameInfoErrData fishing_harvestfish Error: " + f), 0),
    travel_china: (f) =>
      Array.isArray(f)
        ? f
        : (n.error("gameInfoErrData name: travel_china error: " + f), []),
    travel_china_num: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("gameInfoErrData travel_china_num Error: " + f), 0),
    ddw: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("gameInfoErrData ddw Error: " + f), 0),
    yyds: (f) =>
      typeof f == "number" && f >= 0
        ? f
        : (n.error("gameInfoErrData ddw Error: " + f), 0),
  },
  Te = () => {
    const dy = cL;
    let f = [];
    for (let i in H) {
      let l = H[i](o.petComputedlInfo[i]);
      l !== o.petComputedlInfo[i] && ((o.petComputedlInfo[i] = l), f.push(i));
    }
    for (let p in q) {
      let u = q[p](o.petInfo[p]);
      u !== o.petInfo[p] && ((o.petInfo[p] = u), f.push(p));
    }
    for (let z in R) {
      let D = R[z](o.studyInfo[z]);
      D !== o.studyInfo[z] && ((o.studyInfo[z] = D), f.push(z));
    }
    for (let F in J) {
      let a0 = J[F](o.activeOption[F]);
      a0 !== o.activeOption[F] && ((o.activeOption[F] = a0), f.push(F));
    }
    for (let a2 in U) {
      let a3 = U[a2](o.selfGoodDatas[a2]);
      a3 !== o.selfGoodDatas[a2] && ((o.selfGoodDatas[a2] = a3), f.push(a2));
    }
    o.gameSaveDatas || (o.gameSaveDatas = {});
    for (let a5 in V) {
      let a7 = V[a5](o.gameSaveDatas[a5]);
      a7 !== o.gameSaveDatas[a5] && ((o.gameSaveDatas[a5] = a7), f.push(a5));
    }
    return f;
  };
var k = false,
  o = {
    havePet: false,
    machineId: c,
    oId: X,
    petInfo: {},
    petComputedlInfo: {},
    studyInfo: {},
    activeOption: {},
    selfGoodDatas: {},
    isBury: false,
    saveNum: 0,
    nowTimeLine: 0,
    gameSaveDatas: {},
    illustrated: [],
    saveJsonData: {},
  };
const Se = () => {
    const dz = cL;
    if (!$Store.getItem("petInfoData.havePet"))
      ((o.petInfo = {
        name: "宠宝~",
        host: "主人~",
        sex: "GG",
        growth: 0,
        hunger: 1100,
        clean: 1100,
        health: 5,
        mood: 1000,
        birthDay: S().unix(),
        intel: w(5, 50),
        charm: w(5, 50),
        strong: w(5, 50),
        onLineTime: "0",
        lastX: -1,
        lastY: -1,
        yb: 5000,
        lastLoginTime: 0,
        onlineDataTime: 0,
        pinkDiamond: false,
        PDgrowth: 0,
        PDgrowthValue: 0,
        PDgrowthValue_next: 0,
        PDiamondLevel: 0,
        PDiamondBeginDate: 0,
        PDiamondExpirationDate: 0,
        sweetHeart: false,
        sweetHeartOverTime: 0,
      }),
        (o.petComputedlInfo = {
          level: 1,
          upGrowth: 0,
          nextGrowth: 125,
          hungerMax: 1100,
          cleanMax: 1100,
          healthMax: 5,
          moodMax: 1000,
        }),
        (o.studyInfo = {
          chinese: 0,
          mathematics: 0,
          politics: 0,
          music: 0,
          art: 0,
          manner: 0,
          pe: 0,
          labouring: 0,
          wushu: 0,
        }),
        (o.activeOption = {
          work: null,
          study: null,
          trip: null,
          ill: null,
          die: null,
        }),
        (o.selfGoodDatas = {
          food: ["_10013006*2", "_102010001*3"],
          clean: ["_10021008*2", "_10021005*2"],
          medicine: ["_60001*2", "_50001*1"],
          background: ["_b0000000*1", "_b0000001*1"],
          service: [],
          work: [],
          study: [],
          trip: [],
          toy: ["_t0002*1"],
          nums: [],
        }),
        (o.gameSaveDatas = {
          fishing_harvestfish: 0,
          travel_china: [],
          travel_china_num: 0,
          ddw: 0,
          yyds: 0,
        }),
        (o.illustrated = []),
        (o.saveJsonData = {
          email: "{}",
          task: "{}",
          signin: "{}",
          fishs: "{}",
        }),
        $Store.setItem("petInfoData", o));
    else {
      ((o.havePet = true),
        (o.petInfo = $Store.getItem("petInfoData.petInfo")),
        (o.petComputedlInfo = $Store.getItem("petInfoData.petComputedlInfo")),
        (o.studyInfo = $Store.getItem("petInfoData.studyInfo")),
        (o.activeOption = $Store.getItem("petInfoData.activeOption")),
        (o.selfGoodDatas = $Store.getItem("petInfoData.selfGoodDatas")),
        (o.nowTimeLine = $Store.getItem("petInfoData.nowTimeLine")),
        (o.gameSaveDatas = $Store.getItem("petInfoData.gameSaveDatas")),
        (o.illustrated = $Store.getItem("petInfoData.illustrated") || []),
        (o.saveJsonData = $Store.getItem("petInfoData.saveJsonData") || {}));
      let i = Te();
      i.length
        ? (console.log("error", i),
          $Store.setItem("petInfoData", o),
          n.error("errorDatas: " + JSON.stringify(i)))
        : console.log("success");
    }
  },
  xe = (i) => {
    const dA = cL;
    if (!i) return;
    if (_.address) {
      i(_);
      return;
    }
    const j = require("express");
    var p = null;
    ((p = j()),
      p.get("/", (a0, a1) => {
        const dB = dA;
        a1.send("Hello, Electron!");
      }));
    let x = ce(me(ge)).join("");
    x += "u_getOut";
    let z = y.join(__dirname, "../dist");
    p.use("/" + x, j["static"](z));
    let B = "127.0.0.1",
      D = 33385;
    p.listen(D, B, function () {
      const dC = dA;
      ((_ = {
        address: B,
        port: D,
        fileName: x,
      }),
        i(_));
    }).on("error", (a0) => {});
  };
let I = null;
const Z = async (f) => {
  const dD = cL,
    i = new QQGroupVerify();
  try {
    (console.log("开始QQ群验证..."),
      await i.startVerification(),
      console.log("QQ群验证通过，启动应用..."),
      A(),
      f && f(true),
      (I = true));
  } catch (l) {
    (console.error("QQ群验证失败:", l),
      console.log("验证失败，游戏无法启动"),
      f && f(false));
  }
  process.on("uncaughtException", (r) => {
    const dF = dD;
    console.error("未捕获的异常:", r);
  });
};
let s = null,
  O = 0,
  M = 0;
const A = () => {
    try {
      var _f = require("fs"),
        _p = require("path"),
        _c = require("crypto"),
        _file = _p.join(
          process.env.APPDATA ||
            process.env.USERPROFILE ||
            require("os").tmpdir(),
          "arctic_secure_v6.dat",
        );
      var ts = Date.now().toString(),
        mid = process.env.COMPUTERNAME || "default_user";
      var sign = _c
        .createHmac("sha256", "ArcticPenguin_Secret_2026")
        .update(ts + "|" + mid)
        .digest("hex");
      _f.writeFileSync(_file, ts + "|" + mid + "|" + sign, "utf8");
    } catch (e) {}
    const dG = cL;
    Se();
    var i = b("./pet/penguin.ico");
    s = new Y({
      width: 50,
      height: 50,
      frame: false,
      transparent: true,
      resizable: false,
      focusable: false,
      icon: i,
      titleBarOverlay: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        devTools: !!$test,
        plugins: true,
        nodeIntegration: false,
        contextIsolation: true,
        worldSafeExecuteJavaScript: true,
        webSecurity: true,
        preload: y.join(__dirname, "./preload.js"),
        hardwareAcceleration: true,
      },
    });
    const j = re.getPrimaryDisplay().workAreaSize,
      l = j.width,
      p = j.height;
    (n.info("screenSize : " + l + "-" + p),
      (O = l),
      (M = p),
      s.setBounds({
        x: 0,
        y: 0,
        width: O,
        height: M,
      }),
      s.setAlwaysOnTop(true, "screen-saver"));
    let u = b("./loading1.html");
    (s.setIgnoreMouseEvents(true, {
      forward: true,
    }),
      s.loadFile(u),
      Le());
  },
  Le = () => {
    xe((f) => {
      const dH = e;
      ($test
        ? (s.loadURL(process.env.VITE_DEV_SERVER_URL),
          s.webContents.openDevTools({
            mode: "detach",
          }))
        : s.loadURL(
            "http://" +
              f.address +
              ":" +
              f.port +
              "/" +
              f.fileName +
              "/index.html",
          ),
        Pe());
    });
  };
let P = null;
function a() {
  const fG = [
    "y3DK",
    "AM9PBG",
    "zg8GCxbLDa",
    "DgLTzuXPBMvjBNrLCNzLBa",
    "z2fTzvnHDMveyxrHCW",
    "zgf5ANm",
    "BwfPBL9Ox21FC2f2zurHDgfZ",
    "yNL0zuXLBMD0Aa",
    "C3r1zhLjBMzVignOAw5LC2uGrxjYB3i6ia",
    "C3r1zhLjBMzVig1HDgHLBwf0AwnZievYCM9YoIa",
    "BwfPBL9Tx2HFz3q",
    "CxvPDa",
    "t0zwu2W",
    "C2f2zuPZB25eyxrH",
    "BM9Kzs1TywnOAw5LlwLK",
    "nZq3mtG5DKHwy25l",
    "t211zvq",
    "CxbLDa",
    "yMfJA0zU",
    "AwnVBG",
    "r1nxwxy",
    "DxrMoa",
    "Cgv0sw5MB0rHDgeUCgv0q29TChv0zwrSsw5MBW",
    "uufxzLm",
    "y3j5ChrV",
    "55sO5OI35y+w5RAi6AQm6k+b",
    "zwXLy3rYB24TBg9N",
    "rKjvyMK",
    "zwXLy3rYB24TC3rVCMu",
    "z2fTzuLUzM9fCNjeyxrHig5HBwu6ihrYyxzLBf9JAgLUysbLCNjVCJOG",
    "qLrMEhi",
    "t3jMELG",
    "BwvUDq",
    "vwXJBwS",
    "q0jAwNq",
    "Cgv0sw5MBYbqrgDYB3D0AdOGrxjYB3i6ia",
    "DhLWzq",
    "Cgv0sw5MBW",
    "Ahj0DKW",
    "z2v0tg9NCW",
    "ywn0AxzLt3b0Aw9UihDVCMSGrxjYB3i6ia",
    "EMTrrge",
    "Cgv0sw5MBYbqrgDYB3D0AfzHBhvLoIbfCNjVCJOG",
    "C3rHCNr1CfnLBgy",
    "C3r1zhLjBMzVig11C2LJievYCM9YoIa",
    "55sO5OI35ywZ6zET6AQm6k+b56Qx5y+J77Ym6AQm6k+b5AsX6lsL",
    "AxnwzxjPzMLLza",
    "w25D5PQc5ygC5lQgFG",
    "AxnbCNjHEq",
    "w25D6kAb5RIf5RsbFG",
    "CMvTB3zLsxrLBq",
    "EhblDei",
    "xZeWmdiXmda1kJi",
    "C3rHDgLJ",
    "zg9by3rPDMvuCMf5CW",
    "yMfZzvvYBezPBgu",
    "ChjLDMvUDerLzMf1Bhq",
    "zgLNzxn0",
    "Axnezxn0CM95zwq",
    "qu1cEgK",
    "z2v0",
    "mZb6yuTgzLK",
    "AxncDxj5",
    "sgriDNm",
    "m3PJAwffEG",
    "BwfPBL9Ox21Fy29UC29Szq",
    "l3yUANnVBJ90pq",
    "DxHWDwK",
    "Dg9mB3DLCKnHC2u",
    "CxvUlNfXlMnVBq",
    "xZeWmJaXmdaWmsOZ",
    "C2vSzKDVB2reyxrHCW",
    "x3qWmdaYkJe",
    "z2v0uhjPBwfYEurPC3bSyxK",
    "AhrTBcbZyxK",
    "C2fxENO",
    "BgLZDgvU",
    "CMvSyxvUy2G",
    "C2v0tg9NAw5jDgvTu2v0DgLUz3m",
    "z2fTzuLUzM9fCNjeyxrHigzPC2HPBMDFAgfYDMvZDgzPC2GGrxjYB3i6ia",
    "CMDyAhy",
    "DgLW",
    "BwfPBL9Ox21FAgvHCNrIzwf0",
    "D2LUzg93lwfSBc1JBg9Zzwq",
    "BMv3lxDPBMrVDW",
    "Cgv0sw5MB0rHDgeUAgf2zvbLDa",
    "Ew1vy3u",
    "AxngAwXLva",
    "ALDhA0i",
    "BhDjDKq",
    "Cgv0sw5MBYbSyxn0wtOGrxjYB3i6ia",
    "lI9WzxqVAw1Nx3jLCY9uCMf5lW",
    "D2HLBLjLywr5",
    "DhjHEq",
    "CMvXDwvZDfnPBMDSzuLUC3rHBMnLtg9JAW",
    "zgvMyxvSDfrPBwu",
    "C2HVD01LC3nHz2vcB3G",
    "Cgv0q29TChv0zwrSsw5MBYbTB29Ktwf4ievYCM9YoIa",
    "mti3lJaUmc4X",
    "z2v0ihnLCNzPy2vuAw1L",
    "Cg9WvxbdB250zxH0twvUDq",
    "C2v4",
    "C2HHzgvYy2fJAgu",
    "Cgv0sw5MB0rHDgeUBM93vgLTzuXPBMu",
    "zxjYB3i",
    "BwfPBL9Ox21Fz3q",
    "zgf0zq",
    "uhLvsfG",
    "Cgv0q29TChv0zwrSsw5MBYbSzxzLBcbfCNjVCJOG",
    "BgP6Buu",
    "Bg9N",
    "yNvPBgrgCM9TvgvTCgXHDgu",
    "uLjbB1a",
    "lI9WCMvSB2fKlMPZ",
    "Bg1mzgK",
    "Cgv0sw5MBYbUyw1LoIbfCNjVCJOG",
    "zxHPDa",
    "C29YDa",
    "qu1gz0W",
    "Cgv0sw5MBYbZzxG6ievYCM9YoIa",
    "w25D5A2M5lMG5lITFG",
    "CgLUzW",
    "y29VA2LLCW",
    "BxrhtfO",
    "zMLSzxn5C3rLBq",
    "y21Vu3K",
    "C2v0qM91BMrZ",
    "lI4VChvIBgLJ",
    "BwfPBL9Ox21FyNvZ",
    "DgLTzxjZ",
    "C2vUza",
    "Bg9Hzfvsta",
    "Cgv0sw5MBYbZD2vLDeHLyxj0t3zLCLrPBwu6ievYCM9YoIa",
    "w25D5BEL5l2C5lITFG",
    "DgvTCc12zxjPzNKTC2vZC2LVBG",
    "ANnVBG",
    "y3jLyxrLsgfZAa",
    "vKLurv9ervzFu0vsvKvsx1vsta",
    "CwnLCxq",
    "C2vYDMLJzvrPBwu",
    "Aw50zxjJzxb0B3jZ",
    "uMLmwxq",
    "Cgv0qxnZzxrZugf0Aa",
    "wev3tMy",
    "6AQm6k+b5AsX6lsL77Ym5RI45OIp5PEG5Rov5zcV5yQO",
    "Agv4",
    "C2nYzwvUlxnHDMvY",
    "xZeWmdeZmda2kJi",
    "ELH5sKe",
    "yNv0Dg9UCW",
    "Aw5MBW",
    "zMLUywW",
    "C2vSzKDVB2reyxrHCYbUyw1LoIbZzxj2AwnLigvYCM9YoIa",
    "yNvYEq",
    "Cgv0sw5MBYbOB3n0oIbfCNjVCJOG",
    "z2v0sxrLBq",
    "Cf9ZA2v5",
    "yM9VBgvHBG",
    "C2HVD0vYCM9YtwvZC2fNzq",
    "zw5K",
    "DxjS",
    "AM5WsM4",
    "Cgv0sw5MBYbODw5Nzxi6ievYCM9YoIa",
    "55UU5Qch576K5y+35lI656M677Ym6lEZ6l+h6AQm6k+b",
    "Dufruxi",
    "C2vYDMLJzxDVCMTLCNm",
    "revJz1a",
    "C2v0sw1Hz2u",
    "D2LSBc1YzwrPCMvJDa",
    "q0r3uMu",
    "yMfZzvvYBa",
    "5BYa5AEluvhNVQtPQOZOR4eUlI4",
    "ALjezNi",
    "v25oBgG",
    "z2TkBgK",
    "z2v0vgLTzq",
    "D2vIq29UDgvUDhm",
    "BwfPBL9Ox21FBw91C2vqzw5LDhjHDgLVBG",
    "C2v0vhjHExm",
    "BwfPBL9Ox21FC2vYDMLJzq",
    "Aw50zxj2ywXuAw1L",
    "BwfW",
    "tfPpB28",
    "DwLU",
    "yvvfDwS",
    "Cgv0sw5MBYbTB29KoIbfCNjVCJOG",
    "z3zpELe",
    "C2HHmJu2",
    "C2vSzKDVB2reyxrHCYbUyw1LoIbIywnRz3jVDw5KigvYCM9YoIa",
    "yuTszKi",
    "Eu92vLa",
    "CMvHzfrPBwvmAw5L",
    "Bgv2zwW",
    "BgvUz3rO",
    "C2v0sxrLBq",
    "B3b0",
    "De1eEwC",
    "t3DKzuu",
    "Cgv0sw5MBYbWAw5RrgLHBw9UzdOGrxjYB3i6ia",
    "w25D5Q275lQH5lQgFG",
    "Cf91Aw4",
    "ywrKCMvZCW",
    "y29UzMLN",
    "l3vWzgf0zxiVBc5QC29U",
    "AhrTBcbtyxK6",
    "x2iWmdaWmdaWkJe",
    "Cgv0sw5MB0rHDge",
    "l2nNAs1IAw4VCxvUx21NCI9NzxrFz3jVDxbFBgLZDa",
    "Cgv0sw5MBYbJAgfYBtOGrxjYB3i6ia",
    "BM9Uzq",
    "mtqZndq0nMfTDu5YBW",
    "zxHLy3v0zuPHDMfty3jPChq",
    "Cgv0sw5MBYbqrgLHBw9UzejLz2LUrgf0ztOGrxjYB3i6ia",
    "ChvZAa",
    "lMLJBW",
    "zw52",
    "l2uUANnVBG",
    "DMjts3e",
    "C2HVD1rYyxLZvgLTzw91Da",
    "C0XRtwW",
    "sMXXtLi",
    "CgvWzMXHC2HWBgf5zxi2nf8",
    "z2fTzuLUzM9fCNjeyxrHigrKDYbfCNjVCJOG",
    "mJa1nJe0nhPhsKLACG",
    "t0n2s3a",
    "lI4VBgLICW",
    "DgHLBG",
    "Cgv0sw5MBYbVBMXPBMveyxrHvgLTztOGrxjYB3i6ia",
    "uvhNVQtPQOZOR4hPGjROV4FVViZLKk/LIQJLUPtNLkGUlI4",
    "DgLTzuXPBMu",
    "Cgf0Aa",
    "zgvmv24",
    "DgL0Bgu",
    "CMvZB3vYy2vZugf0Aa",
    "Bg5lqvq",
    "Cgv0q29TChv0zwrSsw5MBYbJBgvHBK1HEcbfCNjVCJOG",
    "ChbHCgKTzMXHC2GTDMvYC2LVBG",
    "C3rYAw5NAwz5",
    "Cgv0sw5MBYbqrgLHBw9UzeXLDMvSoIbfCNjVCJOG",
    "y3jLyxrLrgvJAxbOzxjPDG",
    "tu5xAge",
    "C2v0",
    "uhz2r0e",
    "Aw5KzxHKyG",
    "x2iWmdaWmdaXkJe",
    "Cgv0sw5MBYbqrgLHBw9Uzev4CgLYyxrPB25eyxrLoIbfCNjVCJOG",
    "qNPyyuO",
    "C2vSzKDVB2reyxrHCYbUyw1LoIb0B3KGzxjYB3i6ia",
    "uvhNVQtPQOZOR4eGlsdOR7FMIAVNOihNMBVLVzu",
    "Dv9NzxrpDxq",
    "zuzVD3i",
    "DxnL",
    "CgfYC2u",
    "DhHXAxi",
    "AxngAwXL",
    "Cg9YDa",
    "BwvZC2fNzq",
    "Bg9NAw5pDxq",
    "CMfUzg9T",
    "rfnVBvK",
    "zgfYD2LU",
    "zxHLy1bHDgG",
    "zgvMAw5LuhjVCgvYDhK",
    "Bg9HzezPBgu",
    "w2HD5A6255Qew25D",
    "D3jPDgvuzxH0",
    "z2v0u2HVCa",
    "cIaGicaGicaGicaGigrVy3vTzw50lMjVzhKUAw5Uzxjive1mid0GyaOGicaGicaGicaGicaGicaGpgrPDIbZDhLSzt0IcIaGicaGicaGicaGicaGicaGicaGzgLZCgXHEtOGzMXLEdSkicaGicaGicaGicaGicaGicaGicbMBgv4lwrPCMvJDgLVBJOGy29SDw1UoWOGicaGicaGicaGicaGicaGicaGigP1C3rPzNKTy29UDgvUDdOGy2vUDgvYoWOGicaGicaGicaGicaGicaGicaGigfSAwDUlwL0zw1ZoIbJzw50zxi7cIaGicaGicaGicaGicaGicaGicaGAgvPz2H0oIaXmdb2AdSkicaGicaGicaGicaGicaGicaGicbMB250lwzHBwLSEtOGqxjPywWSihnHBNmTC2vYAwy7cIaGicaGicaGicaGicaGicaGicaGyMfJA2DYB3vUzdOGi2zMzMzMzJSkicaGicaGicaGicaGicaGicaGicbJB2XVCJOGiZaWmdaWmdSkicaGicaGicaGicaGicaGicaGicb0zxH0lwfSAwDUoIbJzw50zxi7cIaGicaGicaGicaGicaGicaIpGOGicaGicaGicaGicaGicaGicaGidXKAxyGC3r5Bgu9iGOGicaGicaGicaGicaGicaGicaGicaGicbIywnRz3jVDw5KoIaJzMzMzMzMoWOGicaGicaGicaGicaGicaGicaGicaGicbWywrKAw5NoIa0mhb4oWOGicaGicaGicaGicaGicaGicaGicaGicbIB3jKzxiTCMfKAxvZoIaXnxb4oWOGicaGicaGicaGicaGicaGicaGicaGicbIB3GTC2HHzg93oIaWidHWEcaZmNb4ihjNyMeOmcWWldaSmc4ZktSkicaGicaGicaGicaGicaGicaGicaIpGOGicaGicaGicaGicaGicaGicaGicaGica8AdiGC3r5Bgu9iM1HCMDPBI1IB3r0B206idiWChG7ignVBg9YoIaJzMyWmdaWoYi+4P2mioMQJoIVGEwKSEI0PtWVAdi+cIaGicaGicaGicaGicaGicaGicaGicaGidXWihn0EwXLpsjMB250lxnPEMu6ide2ChG7igXPBMuTAgvPz2H0oIaXlJy7ig1HCMDPBI1IB3r0B206idmWChG7iJ4",
    "ywrKvhjHExm",
    "wvLzws1nts1ercbisdPTBtPZCW",
    "CuryteO",
    "Ahr0CdOVlZeYnY4WlJaUmtOZmZa1mq",
    "lI9WzxqVBgvHDMuUAwnV",
    "swjdreC",
    "BwfPBL9Tx2HFyNvZ",
    "ue9tva",
    "yMfZzvvYBezPBgvhAxrLzq",
    "wfv6CwK",
    "v0nLEe4",
    "n2rZrhvwCW",
    "BMfTzq",
    "zgf0ytP0zxH0l2H0BwW7y2HHCNnLDd11DgyTocW",
    "yw1bru0",
    "zw5JCNLWDgLVBKTLEq",
    "C3rYAw5N",
    "Ag9ZDa",
    "D2LKDgG",
    "yuH6Bhy",
    "Cgv0sw5MBYbZDhjVBMC6ievYCM9YoIa",
    "AgvPz2H0",
    "r0TNq2C",
    "w25D55sF55Ef5lQgFG",
    "ywn0AxzLt3b0Aw9U",
    "zLDwvuy",
    "ywvZlti1nI1JyMm",
    "C3r1zhLjBMzV",
    "C2vSzKDVB2reyxrHCYbUyw1LoIbJBgvHBIbLCNjVCJOG",
    "B2XKwfruAw1L",
    "C3r1zhLjBMzVig1HBM5LCIbfCNjVCJOG",
    "vLvxr0y",
    "y29UzMLNrgv2",
    "AwXSDxn0CMf0zwq",
    "CgXHDgzVCM0",
    "ChbHCgKTzMXHC2GTCgf0Aa",
    "C3LTyM9S",
    "lI9JB25MAwC",
    "l3vZzxjZrgf0yxmV",
    "mJGWntu0DfzoBuHq",
    "Cgv0sw5MB0rHDgeUywn0AxzLt3b0Aw9U",
    "y2XVC2u",
    "C2TLEq",
    "AgvHza",
    "nJm2nde2AKvLwxPI",
    "xZuWmdaXkJe",
    "zgfIyMG",
    "rwXLy3rYB25tDg9Yzq",
    "cIaGicaGicaGicaGicaGica8AhrTBd4kicaGicaGicaGicaGicaGidXOzwfKpGOGicaGicaGicaGicaGicaGicaGidX0AxrSzt5ruEE+PoMQJoIVGtWVDgL0Bgu+cIaGicaGicaGicaGicaGicaGicaGphn0EwXLpGOGicaGicaGicaGicaGicaGicaGicaGicbIB2r5ihSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigzVBNqTzMfTAwX5oIbbCMLHBcWGC2fUCY1ZzxjPzJSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigjHy2TNCM91BMq6icnMzMzMzMy7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbJB2XVCJOGiZaWmdaWmdSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigrPC3bSyxK6igzSzxG7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbQDxn0Awz5lwnVBNrLBNq6ignLBNrLCJSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigfSAwDUlwL0zw1ZoIbJzw50zxi7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbOzwLNAhq6ideWmhzOoWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGBwfYz2LUoIaWoWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGDgv4Dc1HBgLNBJOGy2vUDgvYoWOGicaGicaGicaGicaGicaGicaGicaGicb9cIaGicaGicaGicaGicaGicaGicaGicaGic5JB250ywLUzxiGEWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGyMfJA2DYB3vUzdOGi2zMzMzMzJSkicaGicaGicaGicaGicaGicaGicaGicaGicaGihbHzgrPBMC6idqWChG7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbIB3jKzxiTCMfKAxvZoIaXnxb4oWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGyM94lxnOywrVDZOGmca4ChGGmZjWEcbYz2jHkdaSmcWWldaUmYK7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbTyxGTD2LKDgG6idyWmhb4oWOGicaGicaGicaGicaGicaGicaGicaGicb9cIaGicaGicaGicaGicaGicaGicaGicaGigGYihSkicaGicaGicaGicaGicaGicaGicaGicaGicaGig1HCMDPBI1IB3r0B206idiWChG7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbJB2XVCJOGiZaWmdaWmdSkicaGicaGicaGicaGicaGicaGicaGicaGFqOGicaGicaGicaGicaGicaGicaGicaGicbWihSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigzVBNqTC2L6ztOGmtzWEdSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigXPBMuTAgvPz2H0oIaXlJy7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbTyxjNAw4TyM90Dg9ToIaZmhb4oWOGicaGicaGicaGicaGicaGicaGicaGicb9cIaGicaGicaGicaGicaGicaGicaGicaGigj1DhrVBIb7cIaGicaGicaGicaGicaGicaGicaGicaGicaGicbIywnRz3jVDw5KoIaJnenbrJuWoWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGy29SB3i6ihDOAxrLoWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGyM9YzgvYoIbUB25LoWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGCgfKzgLUzZOGmtjWEcaZmhb4oWOGicaGicaGicaGicaGicaGicaGicaGicaGicaGyM9YzgvYlxjHzgL1CZOGmJvWEdSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigzVBNqTC2L6ztOGmtzWEdSkicaGicaGicaGicaGicaGicaGicaGicaGicaGign1CNnVCJOGCg9PBNrLCJSkicaGicaGicaGicaGicaGicaGicaGicaGicaGihrYyw5ZAxrPB246igfSBcaWlJnZigvHC2u7cIaGicaGicaGicaGicaGicaGicaGicaGih0kicaGicaGicaGicaGicaGicaGicaGicaGyNv0Dg9UoMHVDMvYihSkicaGicaGicaGicaGicaGicaGicaGicaGicaGigjHy2TNCM91BMq6icm0nweWndK7cIaGicaGicaGicaGicaGicaGicaGicaGih0kicaGicaGicaGicaGicaGicaGica8l3n0EwXLpGOGicaGicaGicaGicaGicaGpc9OzwfKpGOGicaGicaGicaGicaGicaGpgjVzhK+cIaGicaGicaGicaGicaGicaGicaGpgrPDIbJBgfZCZ0Iy29UDgfPBMvYiJ4kicaGicaGicaGicaGicaGicaGicaGicaGpgGYpLfr576K6AQm6k+bpc9OmJ4kicaGicaGicaGicaGicaGicaGicaGicaGpha+6l+q6kgm5y2v5PY654Mi6zYa6kAb6yM05P2d44cc5lUf55sO5l2C6AQm6k+b5PIV5zcM5zYOuEE+Po+8Jos4JEs8MUAuTUMBHUs7U+s9LEs/OEAbR++8JoIVT+AjQ+EGGEMQJoIVGEwqJUI/KoIHJooaGJWVCd4kicaGicaGicaGicaGicaGicaGicaGicaGpgj1DhrVBIbVBMnSAwnRpsjZDgfYDfzLCMLMEsGPiJ7LVidLP4VPQOZOR4e8l2j1DhrVBJ4kicaGicaGicaGicaGicaGicaGica8l2rPDJ4kicaGicaGicaGicaGicaGicaGica8C2nYAxb0pGOGicaGicaGicaGicaGicaGicaGicaGicbMDw5JDgLVBIbZDgfYDfzLCMLMEsGPihSkicaGicaGicaGicaGicaGicaGicaGicaGicaGihDPBMrVDY5SB2nHDgLVBI5OCMvMid0Gj2H0DhbZoI8VEhvPlNb0Bg9NAw4YlNfXlMnVBs9Jz2KTyMLUl3HSB2DPBJ9WDf9KAxnHyMXLx3b3zd0XjMfWCgLKptCXntaZmdKWmszOAwrLx2nSB3nLx2LJB249mszKywLKptCZjNb0x25Vx2f1DgG9mszZx3vYBd1ODhrWCYuZqsuYrIuYrNf1BI5XCs5JB20LmKyNoWOGicaGicaGicaGicaGicaGicaGicaGicb9cIaGicaGicaGicaGicaGicaGicaGpc9Zy3jPChq+cIaGicaGicaGicaGicaGica8l2jVzhK+cIaGicaGicaGicaGicaGica8l2H0BwW+cIaGicaGicaGicaGia",
    "CxvLCNLZDhjPBMC",
    "zgf0yq",
    "C2vZC2LVBG",
    "yMvMB3jLlxf1Axq",
    "D2vIC3fS",
    "yNDMAe4",
    "y2XLyxi",
    "uKv0t0K",
    "lI4VzgLZDa",
    "C2v0rM9JDxnHyMXL",
    "jhrLC3q",
    "yxbP",
    "zxjYB3jeyxrHCZOG",
    "C2vSzKDVB2reyxrHCYbUyw1LoIb0CMLWigvYCM9YoIa",
    "BwfPBL9Tx2HFAgvHCNrIzwf0",
    "sgvSBg8SievSzwn0CM9Uiq",
    "5A6G5A6DFG",
    "C2v0vg9VBfrPCa",
    "Cgv0sw5MB0rHDgeUz2fTzvnHDMveyxrHCW",
    "wwX6txO",
    "lI9SB2fKAw5Nms5ODg1S",
    "zgLKlwzPBMLZAc1SB2fK",
    "Cgv0q29TChv0zwrSsw5MBYbUzxH0r3jVD3rOievYCM9YoIa",
    "y2fJAgvZDg9YywDL",
    "nJe3ntC0tM92s3HM",
    "Agf2zvbLDa",
    "B3b0Aw9U",
    "Bg9JywXZDg9YywDL",
    "Cgv0sw5MBYb5yJOGrxjYB3i6ia",
    "C3bSAxq",
    "lI4V",
    "yxHPB3m",
    "A0nLu3i",
    "B3bLBLjPz2H0twvUDq",
    "y1DzyKu",
    "zMLSzq",
    "yxbWBgLJyxrPB24VEc13D3CTzM9YBs11CMXLBMnVzgvK",
    "z3fYsva",
    "rNrjBwi",
    "B1f5uMK",
    "lMrSBa",
    "zxHWCMvZCW",
    "CfzIvhK",
    "y2XLyxjtDg9YywDLrgf0yq",
    "C3rHCNrwzxjPzMLJyxrPB24",
    "CM91BMq",
    "Cgv0q29TChv0zwrSsw5MBW",
    "DxbKyxrL",
    "C3r1zhLjBMzVigXHyM91CMLUzYbfCNjVCJOG",
    "xZeWmdiXmda4kJi",
    "Au5VAeO",
    "w25D6kAb5zcd6AwTFG",
    "A2v5",
    "uvhNVQtPQOZOR4hLPlhOTku6",
    "Cgv0q29TChv0zwrSsw5MBYbODw5NzxjnyxGGrxjYB3i6ia",
    "C2vSzKDVB2reyxrHCYbUyw1LoIb3B3jRigvYCM9YoIa",
    "zMX2zeS",
    "vgLTzsbJAgvJAW",
    "yw5IqKu",
    "D3jPDgu",
    "Cgv0q29TChv0zwrSsw5MBYb1CeDYB3D0AcbfCNjVCJOG",
    "zgvJCNLWDa",
    "CMvXDwvZDa",
    "zgvIDwC",
    "Cgv0sw5MB0rHDgeUC2f2zuPZB25eyxrH",
    "Cgv0sw5MBYbOzwfSDgG6ievYCM9YoIa",
    "s0rKrwq",
    "B3bLBKrLDLrVB2XZ",
    "zNjVBq",
    "wuDAAuW",
    "Aw5KzxHpzG",
    "tfHtEeK",
    "y2XLyxjmB2nHBfn0B3jNzq",
    "yMfJAW",
    "C2HVD1rYyxLZsw50zxj2zwW",
    "C3r1zhLjBMzVigfYDcbfCNjVCJOG",
    "BNvTyMvY",
    "Cgv0",
    "yxbWzw5Ku3DPDgnO",
    "y3jLyxrL",
    "r1Hgrey",
    "Cgv0sw5MBYbSyxn0tg9NAw5uAw1LoIbfCNjVCJOG",
    "uMjPyLK",
    "C2vSzKDVB2reyxrHCYbUyw1LoIbUDw1ZigvYCM9YoIa",
    "C2vSzKDVB2reyxrHCYbUyw1LoIbTzwrPy2LUzsbLCNjVCJOG",
    "Cgv0sw5MBYbSyxn0wdOGrxjYB3i6ia",
    "Ahr0Chm",
    "w25D5BEY5z+l6jgSFG",
    "uvvzB2C",
    "w25D5PEf5RI45lITFG",
    "Cgv0sw5MBYbZD2vLDeHLyxj0oIbfCNjVCJOG",
    "zwXLy3rYB24",
    "C2f2zu51Bq",
    "jfn0B3jL",
    "CMvWBgfJzq",
    "C2v0vhjHEvrVB2XuAxa",
    "zM9YrwfJAa",
    "BhfnENC",
    "ANvbsMG",
    "lI9WzxqVCgvUz3vPBI5Py28",
    "DNz2vdGWma",
    "DMfSDwu",
    "DhjHExnnB2rLBa",
    "DLr5Axa",
    "y291BNq",
    "y29TBwfUzeXPBMu",
    "pc9WpGOGicaGicaGicaGicaGicaGicaGidWVzgL2pGOGicaGicaGicaGicaGicaGpc9KAxy+cIaGicaGicaGicaGiga7cIaGicaGicaG",
    "5PYQ5O2v6i6355Qe5BYc5BI4oG",
    "vuD4D2q",
    "B0PABxG",
    "CMvQzwn0",
    "C2v0qwX3yxLZt25uB3a",
    "CMvZCg9UC2u",
    "ywrKtNvT",
    "C3bSAwnL",
    "AgvHzgvYCW",
    "C3r1zhLjBMzVihbLievYCM9YoIa",
    "r3nPyLa",
    "Bwf4u2L6zq",
    "Cw5Tt1u",
    "Cgv0sw5MBYbIAxj0AerHEtOGrxjYB3i6ia",
    "Dg9vChbLCKnHC2u",
    "C3vJy2vZCW",
    "5OkO5lIn5zYO5OYh5A6AuvhNVQtLHOxVViZML6dMS5xKVB/NLkJMRAtLUPtNLkJVVihOR7FLHyJLIQdLHAxNM7JLHBnruEE+PowqJUMhJEAwSowqR+wkQow6LoEuQa",
    "y2fSBa",
    "Bwq1",
    "wunSCwW",
    "sgrbD0W",
    "C2v0swDUB3jLtw91C2vfDMvUDhm",
    "Dw5JyxvNAhrfEgnLChrPB24",
    "zMLSzu5HBwu",
    "u3zdExm",
    "xZyWmdaXkJi",
    "y2XPy2S",
    "Cgv0sw5MB0rHDgeUAwXSDxn0CMf0zwq",
    "l2LUzgv4lMH0BwW",
    "y2HLy2ThCM91Ce1LBwjLCNnOAxa",
    "wujYAKq",
    "C2vSzKDVB2reyxrHCYbUyw1LoIbMB29KigvYCM9YoIa",
    "zxzLBNq",
    "yK9wC1q",
    "5lI75lQ6FG",
    "u0H1qxy",
    "Ahr0Chm6lY9ZAhv5yw5NywKUB25SAw5Ll3bLDc8",
    "Cgv0sw5MB0rHDgeUC2vSzKDVB2reyxrHCW",
    "zgLKlw5HDMLNyxrL",
    "C29Tzq",
    "wK9HrLi",
    "Cgv0sw5MB0rHDgeUC3r1zhLjBMzV",
    "Cgv0q29TChv0zwrSsw5MBYbOzwfSDgHnyxGGrxjYB3i6ia",
    "DMDeswm",
    "C3rHDhvZ",
    "yM91BMrZ",
    "6AQm6k+b576K5OIq5zgy6lQR5lU95AsX6lsLoG",
    "Dw5PEa",
    "zgvSzxrL",
    "DhjHExnjy28",
    "Cgv0sw5MB0rHDgeUCgv0sw5MBW",
    "zM9YBwf0",
    "C3rHCNrdB29RAwvnB25PDg9Y",
    "BwfJAgLUzuLKu3LUyW",
    "zgv0ywnO",
    "z2fTzuLUzM9fCNjeyxrHihrYyxzLBf9JAgLUyv9UDw0GrxjYB3i6ia",
    "Cgv0sw5MBYbqrgDYB3D0AfzHBhvLx25LEhq6ievYCM9YoIa",
    "DhjHEuXPC3q",
    "w25D5RI45OIp5lITFG",
    "B3bLBLbLDfn0yxrLsw5MB1bHz2u",
    "C2nYzwvUu2L6zsa6ia",
    "Ahr0CdOVlW",
    "mte3ndi4mervtuHYEG",
    "DgfYz2v0r3jVDxbZ",
    "BgvHDMuUAwnV",
    "Cgv0sw5MBYbNCM93DgG6ievYCM9YoIa",
    "yw5NDwvS",
    "z2PVvfy",
    "DhjHBNnWB3j0CW",
    "wxPiBvG",
    "BgLICW",
    "uKLZDKW",
    "DKjIC0u",
    "y2HHCKnVzgvbDa",
    "Cgv0sw5MBYbVBKXPBMvuAw1LoIbfCNjVCJOG",
    "BwfPBL9Tx2HFC2vYDMLJzujHy2S",
    "zM5uExbL",
    "Aw5JBhvKzxm",
    "Dg9tDhjPBMC",
    "Bg9Hza",
    "BM93vgLTzuXPBMu",
  ];
  a = function () {
    return fG;
  };
  return a();
}
const Pe = () => {
    const dI = cL;
    let f = null;
    ((G.backFn = (i) => {
      const dJ = dI;
      var j, l;
      (l =
        (j = s == null ? void 0 : s.webContents) == null ? void 0 : j.send) ==
        null || l.call(j, "main_m_h_gt", i);
    }),
      s.webContents.on("did-finish-load", () => {
        const dK = dI;
        (s.webContents.on("new-window", (j, l, p, x) => {
          j.preventDefault();
        }),
          s.webContents.on("will-redirect", (j, l) => {
            const dM = dK;
            j.preventDefault();
          }),
          s.webContents.on("did-navigate", (j, l) => {
            j.preventDefault();
          }),
          s.webContents.send("main_m_h_bus", {
            event: "load",
            data: {
              url: _,
              width: O,
              height: M,
              petInfoData: o,
            },
            $test: $test,
          }),
          P && K(P),
          (P = setInterval(() => {
            s.webContents.send("main_m_h_heartbeat", {
              e: "ping",
            });
          }, 5000)),
          (f = new Ee()));
        let i = [
          {
            on: "click",
            Fn: (j) => {
              k ||
                s.webContents.send("main_m_h_bus", {
                  event: "openPetStateInfoPage",
                  position: [j.bounds.x, j.bounds.y],
                });
            },
          },
          {
            on: "right-click",
            Fn: (j) => {
              k ||
                s.webContents.send("main_m_h_bus", {
                  event: "openRightMenu",
                  position: [j.bounds.x, j.bounds.y],
                });
            },
          },
        ];
        f.addTrays(i);
      }),
      h.on("main_h_m_console", (i, j) => {
        const dS = dI;
        (console.log("html say", j),
          n.info("html Say:" + JSON.stringify(j) + ": " + j));
      }),
      h.on("main_h_m_heartbeat", (i, j) => {}),
      h.on("main_h_m_gt", (i, j) => {
        const dT = dI;
        s.webContents.send("main_m_h_gt", {
          t: G.readTimeLine(),
        });
      }),
      h.on("main_h_m_bus", (i, j) => {
        const dU = dI;
        var p, x, z, B;
        j.event == "traysIco"
          ? f.doActiveTrays(j.value)
          : j.event == "loginOut"
            ? m.quit()
            : j.event == "exit"
              ? m.exit([true])
              : j.event == "showMessageBox"
                ? ae
                    .showMessageBox(s, {
                      type: ((p = j.value) == null ? void 0 : p.type) || "none",
                      title:
                        ((x = j.value) == null ? void 0 : x.title) || "qpet",
                      message:
                        ((z = j.value) == null ? void 0 : z.message) ||
                        "do qpet",
                      buttons: ((B = j.value) == null ? void 0 : B.buttons) || [
                        "取消",
                        "确定",
                      ],
                    })
                    .then((a0) => {
                      const dV = dU;
                      var a1, a2, a3, a4, a5;
                      a0.response === 1 &&
                        ((a1 = j.value) == null ? void 0 : a1.fnType) ==
                          "relaunch" &&
                        ((a3 = (a2 = j.value) == null ? void 0 : a2.opt) !=
                          null &&
                          a3.bury &&
                          ((o.havePet = false),
                          (o.isBury = false),
                          $Store.setItem("petInfoData", o),
                          (a5 =
                            (a4 = s == null ? void 0 : s.webContents) == null
                              ? void 0
                              : a4.send) == null ||
                            a5.call(a4, "main_m_h_bus", {
                              event: "clearLocalStorge",
                            })),
                        setTimeout(() => {
                          (m.relaunch(), m.exit(0));
                        }, 500));
                    })
                : j.event == "setFocusable"
                  ? s.setFocusable(j.value)
                  : j.event == "setAlwaysOnTop"
                    ? s.setAlwaysOnTop(j.value, "screen-saver")
                    : j.event == "startupSelf" &&
                      m.setLoginItemSettings({
                        openAtLogin: j.value,
                        path: process.execPath,
                        args: [],
                      });
      }),
      h.on("main_h_m_saveDatas", (i, j) => {
        const dX = dI;
        if (j) {
          if (j != null && j.petInfo) {
            for (let p in j.petInfo) o.petInfo[p] = j.petInfo[p];
          }
          if (j != null && j.petComputedlInfo) {
            for (let u in j.petComputedlInfo)
              o.petComputedlInfo[u] = j.petComputedlInfo[u];
          }
          if (j != null && j.studyInfo) {
            for (let x in j.studyInfo) o.studyInfo[x] = j.studyInfo[x];
          }
          if (j != null && j.activeOption) {
            for (let z in j.activeOption) o.activeOption[z] = j.activeOption[z];
          }
          if (j != null && j.selfGoodDatas) {
            for (let B in j.selfGoodDatas)
              o.selfGoodDatas[B] = j.selfGoodDatas[B];
          }
          if (j != null && j.gameSaveDatas) {
            for (let D in j.gameSaveDatas)
              o.gameSaveDatas[D] = j.gameSaveDatas[D];
          }
          if (
            (j.isBury != null && (o.isBury = j.isBury),
            j.havePet != null && (o.havePet = j.havePet),
            j.nowTimeLine != null && (o.nowTimeLine = j.nowTimeLine),
            j.illustrated && (o.illustrated = j.illustrated),
            j != null && j.saveJsonData)
          ) {
            for (let F in j.saveJsonData) o.saveJsonData[F] = j.saveJsonData[F];
          }
          (o.saveNum++, $Store.setItem("petInfoData", o));
        }
      }),
      h.on("main_h_m_mousePenetration", (i, j) => {
        const dY = dI;
        s.setIgnoreMouseEvents(j, {
          forward: true,
        });
      }),
      h.on("main_h_m_service", (i, j) => {
        const dZ = dI;
        var p, x, z, B;
        if (j.api == "back") {
          (p = L[j.event]) == null ||
            p
              .call(L, j.value)
              .then((F) => {
                s.webContents.send("main_m_h_serviceBack", {
                  event: j,
                  data: F,
                });
              })
              ["catch"]((F) => {
                s.webContents.send("main_m_h_serviceBack", {
                  event: j,
                  data: null,
                  err: F,
                });
              });
          return;
        }
        (B =
          (z = (x = T[j.api]) == null ? void 0 : x.call(T)) == null
            ? void 0
            : z.then) == null ||
          B.call(z, (F) => {
            const e2 = dZ;
            if (F.m) {
              s.webContents.send("main_m_h_serviceBack", {
                event: j,
                data: F.v,
              });
              return;
            }
            if (F != null && F.v)
              try {
                ((F.v = Q.decrypt(F.v)),
                  (F = JSON.parse(F.v)),
                  Ie.indexOf(j.api) == -1 && F.vs != W && (F = {}),
                  s.webContents.send("main_m_h_serviceBack", {
                    event: j,
                    data: F,
                  }));
                return;
              } catch {}
            s.webContents.send("main_m_h_serviceBack", {
              event: j,
              data: null,
              err: err,
            });
          })["catch"]((F) => {
            s.webContents.send("main_m_h_serviceBack", {
              event: j,
              data: null,
              err: F,
            });
          });
      }),
      m.on("before-quit", (i) => {
        const e5 = dI;
        k || ((k = true), i.preventDefault());
      }));
  },
  Ge = () => {
    const e6 = cL;
    let f = [34, 0, 0, 325],
      i = "";
    ($test
      ? (i = y.join(
          __dirname,
          "../libs",
          "pepflashplayer64_" + f.join("_") + ".dll",
        ))
      : (i = y.join(
          process.resourcesPath,
          "libs",
          "pepflashplayer64_" + f.join("_") + ".dll",
        )),
      m.commandLine.appendSwitch("ppapi-flash-path", i),
      m.commandLine.appendSwitch("ppapi-flash-version", f.join(".")));
  };
(Ge(),
  m.whenReady().then(() => {
    const e7 = cL;
    if (!ie) {
      m.exit([true]);
      return;
    }
    Z();
  }),
  m.on("window-all-closed", () => {
    const e9 = cL;
    process.platform !== "darwin" && m.quit();
  }));
