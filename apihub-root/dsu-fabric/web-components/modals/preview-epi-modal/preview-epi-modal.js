export class PreviewEpiModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.epiData = JSON.parse(decodeURIComponent(this.element.getAttribute("data-epidata")));
        this.previewModalTitle = this.epiData.previewModalTitle;
        this.productInventedName = this.epiData.inventedName;
        this.productNameMedicinalProduct = this.epiData.nameMedicinalProduct;
        this.textDirection = this.epiData.textDirection;
        this.epiLanguage = this.epiData.epiLanguage;
        this.invalidate();

    }

    beforeRender() {

    }

    afterRender() {
        try {
            this.showXML(this.epiData);
        } catch (e) {
            this.element.dispatchEvent(new Event("close"));
            return webSkel.notificationHandler.reportUserRelevantError("Could not render proper content for the EPI", e);
        }
    }

    closeModal(_target) {
        webSkel.closeModal(_target);
    }

    showXML(epiData) {
        let xmlService = new gtinResolver.XMLDisplayService(document.querySelector(".modal-body"));
        xmlService.displayXmlContent("", decodeURIComponent(escape(atob(epiData.xmlFileContent))), epiData.otherFilesContent);
        xmlService.activateLeafletAccordion();
    }
}
