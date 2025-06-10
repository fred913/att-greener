// ==UserScript==
// @name         ATT Greener
// @namespace    https://ft2.club/
// @version      0.1.4
// @description  Provide a better experience for AMLL TTML Tool users.
// @author       Sheng Fan
// @match        https://amll-ttml-tool.stevexmh.net/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=amll-ttml-tool.stevexmh.net
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==
!function(){"use strict";function t(t){return function(){if(unsafeWindow.Toastify)return unsafeWindow.Toastify;throw new Error("Toastify hasn't loaded yet")}()(t)}(async function(){document.head.insertAdjacentHTML("beforeend",'<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css">');const t=unsafeWindow.document.createElement("script");return t.src="https://cdn.jsdelivr.net/npm/toastify-js",new Promise((n=>{t.onload=()=>{n(!0)},unsafeWindow.document.body.appendChild(t)}))})().then((()=>{t({text:"⚠️ ATT Greener 项目已终止\n\n请查看项目 GitHub 主页",duration:2e4,close:!0,gravity:"top",position:"center",stopOnFocus:!0,onClick:function(){window.open("https://github.com/fred913/att-greener","_blank")},style:{background:"rgb(18, 18, 18)",borderRadius:"16px",border:"2px solid #ff6b6b",fontSize:"14px",padding:"20px",maxWidth:"400px",textAlign:"center"}}).showToast()}))}();
