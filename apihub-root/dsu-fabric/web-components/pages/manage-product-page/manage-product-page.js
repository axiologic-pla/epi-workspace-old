import {createObservableObject, navigateToPage} from "../../../utils/utils.js";
import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class ManageProductPage extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.invalidate(async () => {
            await this.initModel();
        });
    }

    async initModel() {
        let params = webSkel.getHashParams();
        //update an existing product (edit mode)
        if (params["product-code"]) {
            this.buttonName = "Update Product";
            this.operationFnName = "updateProduct";
            let {
                productPayload, productPhotoPayload, EPIs,
            } = await webSkel.appServices.getProductData(params["product-code"]);
            let productModel = webSkel.appServices.createNewProduct(productPayload, productPhotoPayload, EPIs);
            if (!productModel.photo.startsWith("data:image")) {
                productModel.photo = "./assets/images/no-picture.png";
            }
            //save initial state
            this.existingProduct = JSON.parse(JSON.stringify(productModel));
            //observe changes for diffs
            this.productData = createObservableObject(productModel, this.onChange.bind(this));
        } else {
            this.buttonName = "Save Product";
            this.operationFnName = "saveProduct";
            this.productData = webSkel.appServices.createNewProduct();
        }
        this.selected = "epi";
        this.productVersion = this.productData.productVersion;

    }

    beforeRender() {
        let tabInfo = this.productData.epiUnits.map((data) => {
            return {
                language: data.language, filesCount: data.filesCount, id: data.id, action: data.action, type: data.type
            };
        });
        tabInfo = encodeURIComponent(JSON.stringify(tabInfo));
        this.epiTab = `<epis-tab data-presenter="epis-tab" data-units="${tabInfo}"></epis-tab>`;

        let strengthsInfo = this.productData.strengthUnits.map((data) => {
            return {
                substance: data.substance, strength: data.strength, id: data.id, action: data.action
            };
        });

        strengthsInfo = encodeURIComponent(JSON.stringify(strengthsInfo));
        this.strengthTab = `<strengths-tab data-presenter="strengths-tab" data-units="${strengthsInfo}"></strengths-tab>`;

        let marketsInfo = this.productData.marketUnits.map((data) => {
            return {
                marketId: data.marketId,
                mahName: data.mahName,
                mahAddress: data.mahAddress,
                id: data.id,
                action: data.action
            };
        });
        marketsInfo = encodeURIComponent(JSON.stringify(marketsInfo));
        this.marketTab = `<markets-tab data-presenter="markets-tab" data-units="${marketsInfo}"></markets-tab>`;

        if (this.selected === "market") {
            this.tab = this.marketTab;
        }
        if (this.selected === "epi") {
            this.tab = this.epiTab;
        }
        if (this.selected === "strength") {
            this.tab = this.strengthTab;
        }
    }

    afterRender() {

        let productCode = this.element.querySelector("#productCode");
        for (const key of webSkel.appServices.productInputFieldNames()) {
            let input = this.element.querySelector(`#${key}`)
            input.value = this.productData[key] || "";
        }

        this.element.querySelectorAll(".epi-market-tabs button.epi-market-button").forEach(item => {
            item.classList.add("inactive");
            item.classList.remove("highlighted");
        })
        let selectedElement = this.element.querySelector(`.epi-market-tabs button.epi-market-button#${this.selected}`)
        selectedElement.classList.remove("inactive");
        selectedElement.classList.add("highlighted");

        this.element.removeEventListener("input", this.boundDetectInputChange);
        this.boundDetectInputChange = this.detectInputChange.bind(this);
        this.element.addEventListener("input", this.boundDetectInputChange);
        if (this.existingProduct) {
            this.disableProductCode(productCode);
            let button = this.element.querySelector("#accept-button");
            button.disabled = true;
            this.onChange();
        } else {
            productCode.removeEventListener("focusout", this.boundValidateProductCode);
            this.boundValidateProductCode = this.validateProductCode.bind(this, productCode);
            productCode.addEventListener("focusout", this.boundValidateProductCode);
            this.validateProductCode(productCode);
        }
        if (this.productData.photo.startsWith("data:image")) {
            let photo = this.element.querySelector("#photo");
            photo.files = this.fileListPhoto;
            let imgElement = this.element.querySelector(".product-photo");
            imgElement.src = this.productData.photo;
            imgElement.classList.remove("no-image");
        }
    }

    onChange() {
        let button = this.element.querySelector("#accept-button");
        button.disabled = JSON.stringify(this.existingProduct) === JSON.stringify(this.productData, webSkel.appServices.removeMarkedForDeletion);
    }

    switchTab(_target) {
        if (this.selected !== _target.getAttribute("id")) {
            this.selected = _target.getAttribute("id");
            let container = this.element.querySelector(".inner-tab");
            container.innerHTML = "";
            if (this.selected === "epi") {
                this.tab = this.epiTab;
            }
            if (this.selected === "strength") {
                this.tab = this.strengthTab;
            }
            if (this.selected === "market") {
                this.tab = this.marketTab;
            }
            container.innerHTML = this.tab;
            this.afterRender();
        }
    }

    disableProductCode(productCode) {
        let productCodeContainer = this.element.querySelector(".product-code");
        productCodeContainer.classList.add("disabled-form-field")
        productCode.disabled = true;
    }

    detectInputChange(event) {
        let inputName = event.target.name;
        this.productData[inputName] = event.target.value;
    }

    validateProductCode(input, event) {
        let gtin = this.element.querySelector(".gtin-validity");
        let inputContainer = this.element.querySelector(".product-code");
        this.gtinValidationResult = gtinResolver.validationUtils.validateGTIN(input.value);
        if (this.gtinValidationResult.isValid) {
            gtin.classList.remove("invalid");
            gtin.classList.add("valid");
            gtin.innerText = "GTIN is valid";
            inputContainer.classList.remove("product-code-invalid");
        } else {
            gtin.classList.add("invalid");
            gtin.classList.remove("valid");
            gtin.innerText = this.gtinValidationResult.message;
            inputContainer.classList.add("product-code-invalid");
        }
    }


    async showPhoto(controller, photoInput, event) {
        let photoContainer = this.element.querySelector(".product-photo");
        let encodedPhoto = await webSkel.imageUpload(photoInput.files[0]);
        this.fileListPhoto = photoInput.files;
        photoContainer.src = encodedPhoto;
        this.productData.photo = encodedPhoto;
        controller.abort();
    }

    async uploadPhoto() {
        if (this.userRights === "readonly") {
            return;
        }
        let photoInput = this.element.querySelector("#photo");
        const controller = new AbortController();
        photoInput.addEventListener("input", this.showPhoto.bind(this, controller, photoInput), {signal: controller.signal});
        photoInput.click();
    }

    async showAddEPIModal() {
        let modalData = await webSkel.showModal("add-epi-modal", true);
        if (modalData) {
            await this.handleEPIModalData(modalData);
        }
        //else closed without submitting
    }

    deleteEpi(_target) {
        let epiUnit = webSkel.appServices.deleteEPI(_target, this.productData.epiUnits);
        if (!this.existingProduct || !this.existingProduct.epiUnits || !this.existingProduct.epiUnits.find(item => item.language === epiUnit.language && item.type === epiUnit.type)) {
            this.productData.epiUnits = this.productData.epiUnits.filter(item => item.language !== epiUnit.language || item.type !== epiUnit.type)
        }
        this.invalidate();
    }

    async addOrUpdateEpi(modalData) {
        const existingLeafletIndex = this.productData.epiUnits.findIndex(epi => epi.language === modalData.language);
        if (existingLeafletIndex !== -1) {
            /* epi already exists */
            if (this.productData.epiUnits[existingLeafletIndex].action === "add") {
                /* previously added epi */
                modalData.action = "add"
            } else {
                let accept = await webSkel.showModal("dialog-modal", {
                    header: "Warning!!!",
                    message: `This action will replace ${modalData.languageLabel} ${modalData.type}`,
                    denyButtonText: "Cancel",
                    acceptButtonText: "Proceed"
                }, true);
                if (accept) {
                    modalData.action = "update"
                } else {
                    return
                }
            }
            this.productData.epiUnits[existingLeafletIndex] = modalData;
            console.log(`Updated epi, language: ${modalData.language}`);
        } else {
            /* newly added epi */
            modalData.action = "add";
            this.productData.epiUnits.push(modalData);
        }
        this.selected = "epi";
        this.invalidate();
    }

    async handleEPIModalData(data) {
        data.id = webSkel.appServices.generateID(16);
        await this.addOrUpdateEpi(data)
    }

    updateMarket(modalData) {
        if (!modalData.id) {
            return false;
        }
        let existingMarketIndex = this.productData.marketUnits.findIndex(market => market.id === modalData.id);
        if (existingMarketIndex !== -1) {
            this.productData.marketUnits[existingMarketIndex] = modalData;
            console.log(`updated market, country: ${modalData.marketId}`);
            return true;
        }
        return false;
    }

    updateStrength(modalData) {
        if (!modalData.id) {
            return false;
        }
        let existingStrengthIndex = this.productData.strengthUnits.findIndex(strength => strength.id === modalData.id);
        if (existingStrengthIndex !== -1) {
            this.productData.strengthUnits[existingStrengthIndex] = modalData;
            console.log(`updated strengthUnits, substance: ${modalData.substance}`);
            return true;
        }
        return false;
    }

    async handleMarketModalData(data) {
        if (!this.updateMarket(data)) {
            data.id = webSkel.appServices.generateID(16);
            data.action = "add";
            this.productData.marketUnits.push(data);
        }
        this.selected = "market";
        this.invalidate();
    }

    async handleStrengthModalData(data) {
        if (!this.updateStrength(data)) {
            data.id = webSkel.appServices.generateID(16);
            data.action = "add";
            this.productData.strengthUnits.push(data);
        }
        this.selected = "strength";
        this.invalidate();
    }

    async showAddMarketModal() {
        let excludedOptions = this.productData.marketUnits.filter(data => data.action !== "delete")
            .map(data => data.marketId);
        let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
        let modalData = await webSkel.showModal("markets-management-modal", {excluded: encodedExcludedOptions}, true);
        if (modalData) {
            await this.handleMarketModalData(modalData);
        }
        //else closed without submitting
    }

    async addStrengthModal() {
        let excludedOptions = this.productData.marketUnits.filter(data => data.action !== "delete");
        let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
        let modalData = await webSkel.showModal("strengths-management-modal", {excluded: encodedExcludedOptions}, true);
        if (modalData) {
            await this.handleStrengthModalData(modalData);
        }
        //else closed without submitting
    }

    validateFormData(data) {
        const errors = [];

        if (!data.productCode) {
            errors.push('Product Code is required.');
        }

        if (!data.inventedName) {
            errors.push('Brand/invented name is required.');
        }
        if (!data.nameMedicinalProduct) {
            errors.push('Name of Medicinal Product is required.');
        }

        if (this.gtinValidationResult && !this.gtinValidationResult.isValid) {
            errors.push(this.gtinValidationResult.message)
        }

        return {isValid: errors.length === 0, validationErrors: errors}
    }

    async saveProduct(_target) {
        // let formData = await webSkel.extractFormInformation(_target);
        let validationResult = this.validateFormData(this.productData);
        if (validationResult.isValid) {
            await webSkel.appServices.saveProduct(this.productData);
        } else {
            validationResult.validationErrors.forEach((err) => {
                webSkel.notificationHandler.reportUserRelevantError(err);
            })
        }
    }

    async updateProduct() {
        //const conditions = {"otherFieldsCondition": {fn: this.otherFieldsCondition, errorMessage: "Invalid input!"}};
        //  let formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        let validationResult = this.validateFormData(this.productData);

        if (validationResult.isValid) {
            let diffs = webSkel.appServices.getProductDiffs(this.existingProduct, this.productData);
            let confirmation = await webSkel.showModal("data-diffs-modal", {
                diffs: encodeURIComponent(JSON.stringify(diffs)),
                productData: encodeURIComponent(JSON.stringify(this.productData))
            }, true);
            if (confirmation) {
                let shouldSkipMetadataUpdate = false;
                if (!diffs.needsMetadataUpdate) {
                    shouldSkipMetadataUpdate = true;
                }
                await webSkel.appServices.saveProduct(this.productData, this.existingProduct.photo, true, shouldSkipMetadataUpdate);
            }
            //else cancel button pressed
        } else {
            validationResult.validationErrors.forEach((err) => {
                webSkel.notificationHandler.reportUserRelevantError(err);
            })
        }
    }

    async viewLeaflet(_target) {
        let epiObject = webSkel.appServices.getEpitUnit(_target, this.productData.epiUnits);
        let epiPreviewModel = webSkel.appServices.getEpiPreviewModel(epiObject, this.productData);
        await webSkel.showModal("preview-epi-modal", {epidata: encodeURIComponent(JSON.stringify(epiPreviewModel))});
    }

    deleteMarket(_target) {
        let marketUnit = webSkel.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        let selectedMarketUnit = this.productData.marketUnits.find(unit => unit.id === id);
        selectedMarketUnit.action = "delete";
        //this.productData.marketUnits = this.productData.marketUnits.filter(unit => unit.id !== id);
        this.invalidate();
    }

    deleteStrength(_target) {
        let strengthUnit = webSkel.getClosestParentElement(_target, ".strength-unit");
        let id = strengthUnit.getAttribute("data-id");
        let selectedStrengthUnit = this.productData.strengthUnits.find(unit => unit.id === id);
        selectedStrengthUnit.action = "delete";
        //this.productData.marketUnits = this.productData.marketUnits.filter(unit => unit.id !== id);
        this.invalidate();
    }

    async viewMarket(_target) {
        let marketUnit = webSkel.getClosestParentElement(_target, ".market-unit");
        let id = marketUnit.getAttribute("data-id");
        let selectedUnit = this.productData.marketUnits.find(unit => unit.id === id);
        const encodedJSON = encodeURIComponent(JSON.stringify(selectedUnit));
        let excludedOptions = this.productData.marketUnits
            .filter(data => data.marketId !== selectedUnit.marketId && data.action !== "delete")
            .map(data => data.marketId);
        let encodedExcludedOptions = encodeURIComponent(JSON.stringify(excludedOptions));
        let modalData = await webSkel.showModal("markets-management-modal", {
            ["updateData"]: encodedJSON, id: selectedUnit.id, excluded: encodedExcludedOptions
        }, true);
        if (modalData) {
            await this.handleMarketModalData(modalData);
        }
        //else closed without submitting
    }

    async navigateToProductsPage() {
        await navigateToPage("products-page");
    }
}
