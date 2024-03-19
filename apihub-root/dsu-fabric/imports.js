import WebSkel from "./WebSkel/webSkel.js";

export {
    WebSkel
};

// WebSkel Utilities
import { closeModal, showActionBox, showModal, removeActionBox } from "./WebSkel/utils/modal-utils.js";
import { notBasePage, getClosestParentElement, sanitize,unsanitize, reverseQuerySelector,customTrim, moveCursorToEnd,getClosestParentWithPresenter,refreshElement } from "./WebSkel/utils/dom-utils.js";
import { extractFormInformation } from "./WebSkel/utils/form-utils.js";
import { decodeBase64 } from "./WebSkel/utils/template-utils.js";

export {
    closeModal,
    showActionBox,
    showModal,
    removeActionBox,
    notBasePage,
    getClosestParentElement,
    extractFormInformation,
    sanitize,
    unsanitize,
    reverseQuerySelector,
    customTrim,
    moveCursorToEnd,
    getClosestParentWithPresenter,
    refreshElement,
    decodeBase64
};
