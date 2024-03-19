export class DataDiffsModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.diffs = JSON.parse(decodeURIComponent(this.element.getAttribute("data-diffs")));
        this.productData = JSON.parse(decodeURIComponent(this.element.getAttribute("data-productData")));
        this.invalidate();
    }

    beforeRender() {
        let stringHTML = "";
        for (let i = 0; i < this.diffs.length; i++) {
            let property = this.diffs[i].changedProperty;
            let oldValue = this.diffs[i].oldValue.value;
            let newValue = this.diffs[i].newValue.value;
            let sanitize = true;
            if (property === "Product Photo") {
                sanitize = false;
                oldValue = `<img class="photo" src="${oldValue}" alt="oldValue">`;
                newValue = `<img class="photo" src="${newValue}" alt="newValue">`;
            }
            if (property === "Expiry date") {
                sanitize = false;
            }
            if (newValue && newValue.filesCount) {
                newValue = `<div class="view-details pointer" data-item-id=${newValue.id} data-item-type="newValue" data-local-action="viewEPI">view</div>`;
                sanitize = false;
            }
            if (oldValue && oldValue.filesCount) {
                oldValue = `<div class="view-details pointer" data-item-id=${oldValue.id} data-item-type="oldValue" data-local-action="viewEPI">view</div>`;
                sanitize = false;
            }
            if (typeof oldValue === "object" && oldValue.action) {
                delete oldValue.action;
            }
            if (typeof newValue === "object" && newValue.action) {
                delete newValue.action;
            }
            if (i === this.diffs.length - 1) {
                stringHTML += `
                        <div class="cell border border-radius-left">${webSkel.sanitize(property)}</div>
                        <div class="cell border">${typeof oldValue === "object" ? webSkel.sanitize(JSON.stringify(oldValue)) : sanitize ? webSkel.sanitize(oldValue) : oldValue}</div>
                        <div class="cell border-radius-right">${typeof newValue === "object" ? webSkel.sanitize(JSON.stringify(newValue)) : sanitize ? webSkel.sanitize(newValue) : newValue}</div>
            `;
            } else {
                stringHTML += `
                        <div class="cell border">${property}</div>
                        <div class="cell border">${typeof oldValue === "object" ? webSkel.sanitize(JSON.stringify(oldValue)) : sanitize ? webSkel.sanitize(oldValue) : oldValue}</div>
                        <div class="cell">${typeof newValue === "object" ? webSkel.sanitize(JSON.stringify(newValue)) : sanitize ? webSkel.sanitize(newValue) : newValue}</div>
            `;
            }
        }
        this.rows = stringHTML;
    }

    afterRender() {
    }

    closeModal(_target) {
        webSkel.closeModal(_target);
    }

    switchModalView() {
        let modal = webSkel.getClosestParentElement(this.element, "dialog");
        if (!modal.getAttribute("data-expanded")) {
            modal.setAttribute("data-expanded", "true")
            modal.style.width = "95%";
            modal.style.maxWidth = "95vw";
            this.element.style.marginLeft = "0";
        } else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "75%";
            modal.style.maxWidth = "75vw";
            this.element.style.marginLeft = "240px";
        }
    }

    acceptChanges(_target) {
        webSkel.closeModal(_target, true);
    }

    async viewEPI(_target) {
        let itemId = _target.dataset.itemId;
        let itemType = _target.dataset.itemType;
        let diffObj = this.diffs.find(item => item[itemType].value.id === itemId)
        let epiPreviewModel = webSkel.appServices.getEpiPreviewModel(diffObj[itemType].value, this.productData);
        await webSkel.showModal("preview-epi-modal", {epidata: encodeURIComponent(JSON.stringify(epiPreviewModel))});
    }
}
