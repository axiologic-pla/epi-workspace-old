export class AddEpiModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.id = this.element.getAttribute("data-modal-id");
        this.invalidate();
    }

    beforeRender() {
        let languages = gtinResolver.Languages.getListAsVM();
        let stringHTML = "";
        for (let language of languages) {
            stringHTML += `<option ${!language.disabled || "disabled"} ${!language.selected || "selected"} value="${language.value}">${language.label}</option>`;
        }
        this.languageOptions = stringHTML;
    }

    afterRender() {
        this.acceptButton = this.element.querySelector("#accept-button");
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

    displaySelectedFiles(input, event) {
        let epiError = this.element.querySelector(".epi-error");
        let inputContainer = this.element.querySelector(".input-file-container");
        inputContainer.style.background = "none";
        epiError.style.visibility = "hidden";

        const files = input.files;
        const container = this.element.querySelector('.files-table');
        container.innerHTML = "";
        if ('webkitdirectory' in input) {
            let stringHMTL = "";
            for (let i = 0; i < files.length; i++) {
                stringHMTL += `<div class="file-item">
                                    <button class="default-button small-padding" data-local-action="removeFile" data-name="${files[i].name}">&times;</button>
                                    <div class="file-name">${files[i].name}</div>
                               </div>`;
            }
            container.insertAdjacentHTML("beforeend", stringHMTL);
        } else {
            container.textContent = 'This browser does not support selecting directories.';
        }
        let button = this.element.querySelector("#accept-button");
        this.acceptButton.disabled = false;
    }

    uploadFiles() {
        let inputFile = this.element.querySelector("#epiFiles");
        inputFile.removeEventListener("input", this.boundFn);
        this.boundFn = this.displaySelectedFiles.bind(this, inputFile);
        inputFile.addEventListener("input", this.boundFn);
        inputFile.click();
    }

    removeFile(_target) {
        let inputFile = this.element.querySelector("#epiFiles");
        let fileName = _target.getAttribute("data-name");
        let filteredFiles = Array.from(inputFile.files).filter(file => file.name !== fileName);
        let dataTransfer = new DataTransfer();

        filteredFiles.forEach(file => {
            dataTransfer.items.add(file);
        });

        inputFile.files = dataTransfer.files;
        let item = webSkel.getClosestParentElement(_target, ".file-item");
        item.remove();
        this.acceptButton.disabled = inputFile.files.length === 0;
    }

    filesValidation(element, formData) {
        let acceptedFormats = ["text/xml", "image/jpg", "image/jpeg", "image/png", "image/gif", "image/bmp"];
        let filesArray = Array.from(element.files);
        if (!filesArray.some(file => file.type === "text/xml")) {
            return false;
        }
        for (let file of filesArray) {
            if (!acceptedFormats.includes(file.type)) {
                return false;
            }
        }
        return true;
    }

    async addEPI(_target) {
        //  const filesErrorMessage = "Attention: uploaded files format is not supported. To proceed successfully verify that you have an XML file and your XML file adheres to the prescribed format and structure. To obtain the correct XML specifications we recommend consulting our documentation. Thank you!  "
        //  const conditions = {"filesValidation": {fn: this.filesValidation, errorMessage: filesErrorMessage}};
        let formData = await webSkel.extractFormInformation(this.element.querySelector("form"));
        let validEPIContent = await webSkel.appServices.validateEPIFilesContent(formData.data.epiFiles);
        if (formData.isValid && validEPIContent.isValid) {
            let resultObject = {};
            Object.keys(formData.data).forEach(key => {
                resultObject[key] = formData.data[key];
            });
            resultObject.filesCount = resultObject.epiFiles.length;
            resultObject.otherFilesContent = [];

            for (let file of resultObject.epiFiles) {
                if (file.name.endsWith('.xml')) {
                    resultObject.xmlFileContent = await $$.promisify(gtinResolver.DSUFabricUtils.getBase64FileContent)(file);
                } else {
                    let fileContent = await gtinResolver.DSUFabricUtils.getFileContentAsBuffer(file);
                    resultObject.otherFilesContent.push({
                        filename: file.name,
                        fileContent: gtinResolver.utils.getImageAsBase64(fileContent)
                    })
                }
            }
            delete resultObject.epiFiles;
            if (validEPIContent.message) {
                webSkel.notificationHandler.reportUserRelevantInfo(validEPIContent.message);
            }

            webSkel.closeModal(_target, resultObject);
        } else {
            let epiError = this.element.querySelector(".epi-error");
            let inputContainer = this.element.querySelector(".input-file-container");
            inputContainer.style.backgroundColor = "var(--input-invalid)";
            epiError.innerHTML = validEPIContent.message;
            epiError.style.visibility = "visible";
            this.acceptButton.disabled = true;
        }
    }
}
