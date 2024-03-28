import {showModal} from "../WebSkel/utils/modal-utils.js";
import constants from "../constants.js";

function createObservableObject(obj, onChange) {
    return new Proxy(obj, {
        set(target, property, value) {
            target[property] = value;
            onChange();
            return true;
        },
    });
}

//TODO: CODE-REVIEW - migrate the URL logic to webskel
async function loadPage(pageToLoad) {
    const handleURL = (URL = window.location.hash) => {
        return (!URL || URL === '#') ? webSkel.configs.defaultPage : URL.slice(URL.startsWith('#') ? 1 : 0).split('?')[0];
    };
    let currentPage = handleURL(pageToLoad);
    pageToLoad = pageToLoad.substring(1);
    await webSkel.changeToDynamicPage(`${currentPage}`, `${pageToLoad}`);
}

function getCurrentPageTag() {
    let URL = window.location.hash;
    return URL.slice(URL.startsWith('#') ? 1 : 0)
}


function showError(title, message, technical) {
    window.showApplicationError = async () => {
        await showModal("show-error-modal", {
            title: title,
            message: message,
            technical: technical
        });
    }
}

function renderToast(type, message, timeoutValue = 5000) {
    let toastContainer = document.querySelector(".toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.classList.add("toast-container");
        let dialogs = document.querySelectorAll("dialog");
        if (dialogs && dialogs.length > 0) {
            dialogs[dialogs.length - 1].appendChild(toastContainer);
        } else {
            document.body.appendChild(toastContainer);
        }
    }
    let toastElement = document.createElement("div");
    toastElement.classList.add("toast");
    toastElement.classList.add(type);
    toastElement.innerHTML = `<p class="toast-text">${message}</p>`
    let toastButton = document.createElement("div");
    toastButton.classList.add("toast-close-button");
    toastButton.innerHTML = `<svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.705 2.20934C13.8928 2.02156 13.9983 1.76687 13.9983 1.50131C13.9983 1.23575 13.8928 0.981059 13.705 0.793278C13.5172 0.605495 13.2625 0.5 12.997 0.5C12.7314 0.5 12.4767 0.605495 12.2889 0.793278L7 6.08352L1.70944 0.794943C1.52165 0.607161 1.26695 0.501666 1.00137 0.501666C0.735788 0.501666 0.481087 0.607161 0.293294 0.794943C0.105501 0.982724 2.79833e-09 1.23741 0 1.50297C-2.79833e-09 1.76854 0.105501 2.02322 0.293294 2.21101L5.58385 7.49958L0.29496 12.7898C0.107167 12.9776 0.00166609 13.2323 0.00166609 13.4979C0.0016661 13.7634 0.107167 14.0181 0.29496 14.2059C0.482752 14.3937 0.737454 14.4992 1.00303 14.4992C1.26861 14.4992 1.52331 14.3937 1.71111 14.2059L7 8.91565L12.2906 14.2067C12.4784 14.3945 12.7331 14.5 12.9986 14.5C13.2642 14.5 13.5189 14.3945 13.7067 14.2067C13.8945 14.0189 14 13.7643 14 13.4987C14 13.2331 13.8945 12.9784 13.7067 12.7907L8.41615 7.49958L13.705 2.20934Z" fill="black"/>
</svg>`
    toastButton.addEventListener(constants.HTML_EVENTS.CLICK, (evt) => {
        if (toastElement && toastElement.parentElement) {
            toastElement.parentNode.removeChild(toastElement);
        }
    })
    toastElement.appendChild(toastButton);
    setTimeout(() => {
        if (toastElement && toastElement.parentElement) {
            toastElement.parentNode.removeChild(toastElement);
        }
    }, timeoutValue)
    toastContainer.appendChild(toastElement);
}

function parseCookies(cookies) {
    const parsedCookies = {};
    if (!cookies) {
        return parsedCookies;
    }
    let splitCookies = cookies.split(";");
    splitCookies = splitCookies.map(splitCookie => splitCookie.trim());
    splitCookies.forEach(cookie => {
        const cookieComponents = cookie.split("=");
        const cookieName = cookieComponents[0].trim();
        let cookieValue = cookieComponents[1].trim();
        if (cookieValue === "null") {
            cookieValue = undefined;
        }
        parsedCookies[cookieName] = cookieValue;
    })

    return parsedCookies;
}

const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateRandom(length) {
    let charactersSet = characters;
    let result = '';
    const charactersLength = charactersSet.length;
    for (let i = 0; i < length; i++) {
        result += charactersSet.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getSSOId(ssoIdFieldName) {
    let ssoId = localStorage.getItem(ssoIdFieldName);
    if (!ssoId) {
        const parsedCookies = parseCookies(document.cookie);
        ssoId = parsedCookies[ssoIdFieldName];
    }
    return ssoId;
}

function getUserDetails() {
    return getSSOId("SSODetectedId");
}

async function setupGlobalErrorHandlers() {
    const openDSU = require("opendsu");
    let errHandler = openDSU.loadAPI("error");

    errHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.WARN, (notification) => {
        renderToast(constants.NOTIFICATION_TYPES.WARN, notification.message)
    });

    errHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.INFO, (notification) => {
        renderToast(constants.NOTIFICATION_TYPES.INFO, notification.message);
    });

    errHandler.observeUserRelevantMessages(constants.NOTIFICATION_TYPES.ERROR, (notification) => {
        let errMsg = "";
        if (notification.err && notification.err.message) {
            errMsg = notification.err.message;
        }
        let toastMsg = `${notification.message} ${errMsg}`
        renderToast(constants.NOTIFICATION_TYPES.ERROR, toastMsg, 10000);
    })

}

async function navigateToPage(pageTag, data) {
    await webSkel.changeToDynamicPage(pageTag, pageTag, data);
    changeSidebarFromURL();
}

function isCopyToClipboardSupported() {
    let support = !!document.queryCommandSupported;

    ['copy', 'cut'].forEach((action) => {
        support = support && !!document.queryCommandSupported(action);
    });
    return support;
}

function copyToClipboard(text) {
    if (isCopyToClipboardSupported()) {
        navigator.clipboard.writeText(text).catch((error) => {
            console.error('Cannot copy text', error);
        });
    }
}


//other rtl language codes to be used for later:  "arc", "arz", "ckb", "dv", "fa", "ha", "he", "khw", "ks", "ps", "sd", "ur", "uz_AF", "yi"
let rtlLangCodes = ["ar", "he"];

function getTextDirection(lang) {
    let textDirection = "LTR";
    if (rtlLangCodes.find((rtlLAng) => rtlLAng === lang)) {
        textDirection = "RTL"
    }
    return textDirection;
}

function changeSidebarFromURL() {
    let currentPage = window.location.hash;
    let categories = ["home", "my-account", "product", "batch", "audit", "logout"];
    let sidebarItems = document.querySelectorAll(".menu-item");
    let oldSelection = Array.from(sidebarItems).find(sidebarItem => sidebarItem.getAttribute("id") === "active-menu-item");
    if (oldSelection) {
        oldSelection.removeAttribute("id");
    }
    if (!sidebarItems) {
        return;
    }
    let elements = {};
    for (let category of categories) {
        elements[category] = Array.from(sidebarItems).find(sidebarItem => sidebarItem.getAttribute("data-category") === category);
    }
    for (let category of categories) {
        if (currentPage.includes(category)) {
            elements[category].id = "active-menu-item";
            return;
        }
    }
}

export {
    createObservableObject,
    loadPage,
    getCurrentPageTag,
    showError,
    getUserDetails,
    getSSOId,
    setupGlobalErrorHandlers,
    navigateToPage,
    copyToClipboard,
    isCopyToClipboardSupported,
    getTextDirection,
    changeSidebarFromURL,
    generateRandom
}
