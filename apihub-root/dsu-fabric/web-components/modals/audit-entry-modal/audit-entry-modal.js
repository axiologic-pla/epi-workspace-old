import constants from "../../../constants.js";

export class AuditEntryModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.pk = this.element.getAttribute("data-entry");
        this.entry = JSON.parse(decodeURIComponent(this.element.getAttribute("data-entry")));
        if (constants.AUDIT_OPERATIONS.EPI.includes(this.entry.reason)) {
            this.downloadEPICLass = "show";
        }
        if (constants.AUDIT_OPERATIONS.PHOTO.includes(this.entry.reason)) {
            this.downloadImgCLass = "show";
        }
        this.invalidate();
        /*this.invalidate(async () => {
            let logs = await $$.promisify(webSkel.client.filterAuditLogs)(constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, undefined, ["__timestamp > 0", `pk == ${this.pk}`], "desc");
            this.entry = logs[0];
        });*/
    }

    JSONstringifyOrder(obj) {
        const objToDisplay = {};
        let displayKeys = ["details", "version"];
        displayKeys.forEach(key => {
            objToDisplay[key] = obj[key];
        });
        return objToDisplay;
    }

    beforeRender() {
        this.data = JSON.stringify(this.JSONstringifyOrder(this.entry), null, 4);
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

    downloadJSON() {
        let string = JSON.stringify(this.JSONstringifyOrder(this.entry), null, 4);
        const blob = new Blob([string], {type: 'application/json'});
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = `${this.entry.reason}.json`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }

    async downloadEPI() {
        let epiPayload;
        try {
            let epiDetails = this.entry.details[0];
            epiPayload = await webSkel.appServices.retrieveEPI(this.entry.itemCode, this.entry.batchNumber, epiDetails.epiLanguage, epiDetails.epiType, this.entry.version);
            let string = JSON.stringify(epiPayload);
            const blob = new Blob([string], {type: 'application/json'});
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `${this.entry.reason}.json`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
        } catch (err) {
            let toastContent = webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve following EPI's for product code: ${productCode}. <br> Please check your network connection and configuration and try again.`, webSkel.appServices.generateMissingToastList(err.message));
            webSkel.notificationHandler.reportUserRelevantWarning(toastContent, err);
        }
    }

    async downloadImage() {
        let imgPayload;
        imgPayload = await webSkel.appServices.retrieveProductPhotoPayload(this.entry.itemCode, this.entry.version);
        const downloadLink = document.createElement('a');
        downloadLink.href = imgPayload;
        downloadLink.download = "ProductImage.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }
}
