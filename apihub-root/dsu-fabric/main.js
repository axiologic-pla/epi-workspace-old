import {navigateToPage, setupGlobalErrorHandlers} from "./utils/utils.js";

import WebSkel from "./WebSkel/webSkel.js";

const openDSU = require("opendsu");

import env from "./environment.js";

function saveCurrentState() {
    webSkel.currentState = Object.assign({}, history.state);
}

window.webSkel = await WebSkel.initialise("./webskel-configs.json");

webSkel.notificationHandler = openDSU.loadAPI("error");

(async () => {
    webSkel.setLoading(`<div class="spinner-container"><div class="spin"></div></div>`);
    await setupGlobalErrorHandlers();
    window.gtinResolver = require("gtin-resolver");
    let domain = "default";
    const {epiDomain, epiSubdomain} = env;
    webSkel.client = gtinResolver.getEPISorClient(epiDomain, epiSubdomain);

    webSkel.setDomElementForPages(document.querySelector("#page-content"));

    const loader = document.querySelector("#before-webskel-loader");
    loader.close(); // Close the loader
    loader.remove();

    await navigateToPage("landing-page", {["source-page"]: window.location.hash || "#home-page"});
    window.addEventListener('beforeunload', saveCurrentState);
})();
