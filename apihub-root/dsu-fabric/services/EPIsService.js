import {getTextDirection} from "../utils/utils.js";
import constants from "../constants.js";


export class EPIsService {
    constructor() {
    }

    getEpitUnit(actionElement, epiUnits) {
        let epiUnit = webSkel.getClosestParentElement(actionElement, ".epi-unit");
        let id = epiUnit.getAttribute("data-id");
        let l_unit = epiUnits.find(unit => unit.id === id);
        return l_unit;
    }

    getEPIPayload(epi, productCode, batchNumber) {
        let result = webSkel.appServices.initMessage(epi.type);
        result.payload = {
            productCode: productCode,
            batchNumber: batchNumber,
            language: epi.language
        };

        if (epi.action !== constants.EPI_ACTIONS.DELETE) {
            result.payload.xmlFileContent = epi.xmlFileContent;
            if (epi.otherFilesContent) {
                result.payload.otherFilesContent = epi.otherFilesContent.map(payload => {
                    return {
                        filename: payload.filename,
                        fileContent: payload.fileContent.split("base64,")[1]
                    }
                })
            }
        }
        return result;
    }

    getEpiPreviewModel(epiObject, productData) {
        let previewModalTitle = `Preview ${gtinResolver.Languages.getLanguageName(epiObject.language)} ${epiObject.type}`;
        let textDirection = getTextDirection(epiObject.language)
        return {
            previewModalTitle,
            "xmlFileContent": epiObject.xmlFileContent,
            "otherFilesContent": epiObject.otherFilesContent,
            "inventedName": productData.inventedName,
            "nameMedicinalProduct": productData.nameMedicinalProduct,
            textDirection,
            epiLanguage: epiObject.language
        };
    }

    getEpiModelObject(payload, language, epiType) {
        let epiFiles = [payload.xmlFileContent, ...payload.otherFilesContent];
        return {
            id: webSkel.appServices.generateID(16),
            language: language,
            xmlFileContent: payload.xmlFileContent,
            otherFilesContent: payload.otherFilesContent,
            filesCount: epiFiles.length,
            type: epiType
        }
    }

    deleteEPI(eventTarget, epiUnits) {
        let epiUnitElement = webSkel.getClosestParentElement(eventTarget, ".epi-unit");
        let id = epiUnitElement.getAttribute("data-id");
        let epiUnit = epiUnits.find(unit => unit.id === id);
        epiUnit.action = "delete";
        return epiUnit;
    }

    async validateEPIFilesContent(epiFiles) {
        let acceptedFormats = ["text/xml", "image/jpg", "image/jpeg", "image/png", "image/gif", "image/bmp"];
        let returnMsg = "";
        let toastMessage = "Uploaded XML file contains unknown image reference";
        try {
            let xmlContent;
            let epiImages = {};
            for (let file of epiFiles) {
                if (!acceptedFormats.includes(file.type)) {
                    returnMsg = `${file.type} is not a supported file type.`;
                    return {isValid: false, message: returnMsg};
                }
                if (file.name.endsWith(".xml")) {
                    xmlContent = await gtinResolver.DSUFabricUtils.getFileContent(file);
                } else {
                    let fileContent = await gtinResolver.DSUFabricUtils.getFileContentAsBuffer(file);
                    epiImages[file.name] = gtinResolver.utils.getImageAsBase64(fileContent);
                }
            }

            let xmlService = new gtinResolver.XMLDisplayService(document.querySelector(".modal-body"));

            let htmlXMLContent = xmlService.getHTMLFromXML("", xmlContent);
            let leafletHtmlContent = xmlService.buildLeafletHTMLSections(htmlXMLContent);
            if (!leafletHtmlContent) {
                returnMsg = webSkel.appServices.getToastListContent(toastMessage, webSkel.appServices.generateMissingToastList(missingImgFiles));
                return {isValid: false, message: returnMsg};
            }

            let leafletHtmlImages = htmlXMLContent.querySelectorAll("img");
            let uploadedImageNames = Object.keys(epiImages);
            let differentCaseImgFiles = [];
            let missingImgFiles = [];
            let htmlImageNames = Array.from(leafletHtmlImages).map(img => img.getAttribute("src"));

            let dataUrlRegex = new RegExp(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i);
            let hasUnsupportedEmbeddedImage = false;

            htmlImageNames.forEach(imgName => {
                if (!epiImages[imgName]) {
                    let differentCaseImg = uploadedImageNames.find((item) => item.toLowerCase() === imgName.toLowerCase())
                    if (differentCaseImg) {
                        differentCaseImgFiles.push({xmlName: imgName, fileName: differentCaseImg});
                    } else if (imgName.startsWith("data:")) {
                        if (!hasUnsupportedEmbeddedImage && !imgName.match(dataUrlRegex)) {
                            hasUnsupportedEmbeddedImage = true;
                        }
                    } else {
                        missingImgFiles.push(imgName);
                    }
                }

            })

            if (hasUnsupportedEmbeddedImage) {
                missingImgFiles.push("The XML file contains an unsupported embedded image.");
            }

            if (missingImgFiles.length > 0) {
                returnMsg = webSkel.appServices.getToastListContent(toastMessage, webSkel.appServices.generateMissingToastList(missingImgFiles));
                return {isValid: false, message: returnMsg};
            }
            if (differentCaseImgFiles.length > 0) {
                returnMsg = webSkel.appServices.getToastListContent(toastMessage, webSkel.appServices.generateDifferentCaseToastList(differentCaseImgFiles))
            }
            return {isValid: true, message: returnMsg};
        } catch (e) {
            returnMsg = "Attention: uploaded files format is not supported. To proceed successfully verify that you have an XML file and your XML file adheres to the prescribed format and structure. To obtain the correct XML specifications we recommend consulting our documentation. Thank you! "
            return {isValid: false, message: returnMsg};
        }

    }

    async executeEPIActions(EPIs, productCode, batchNumber) {
        let failedEpiOperations = [];
        for (let EPI of EPIs) {
            try {
                let epiPayload = webSkel.appServices.getEPIPayload(EPI, productCode, batchNumber);

                if (EPI.action === constants.EPI_ACTIONS.ADD) {
                    if (batchNumber) {
                        await $$.promisify(webSkel.client.addBatchEPI)(productCode, batchNumber, EPI.language, EPI.type, epiPayload);
                    } else {
                        await $$.promisify(webSkel.client.addProductEPI)(productCode, EPI.language, EPI.type, epiPayload);
                    }
                }

                if (EPI.action === constants.EPI_ACTIONS.UPDATE) {
                    if (batchNumber) {
                        await $$.promisify(webSkel.client.updateBatchEPI)(productCode, batchNumber, EPI.language, EPI.type, epiPayload);
                    } else {
                        await $$.promisify(webSkel.client.updateProductEPI)(productCode, EPI.language, EPI.type, epiPayload);
                    }
                }

                if (EPI.action === constants.EPI_ACTIONS.DELETE) {
                    if (batchNumber) {
                        await $$.promisify(webSkel.client.deleteBatchEPI)(productCode, batchNumber, EPI.language, EPI.type);
                    } else {
                        await $$.promisify(webSkel.client.deleteProductEPI)(productCode, EPI.language, EPI.type);
                    }
                }
            } catch (e) {
                failedEpiOperations.push(`${EPI.action} ${EPI.language} ${EPI.type} - failed<br>`);
            }
        }
        if (failedEpiOperations.length > 0) {
            let err = new Error("");
            err.reason = failedEpiOperations;
            throw err;
            // webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't execute following actions:`, failedEpiOperations));
        }
    }

    async retrieveEPIs(productCode, batchNumber, epiType) {
        let EPIs = [];
        let failedEPIs = [];
        let epiLanguages = [];
        try {
            if (batchNumber) {
                epiLanguages = await $$.promisify(webSkel.client.listBatchLangs)(productCode, batchNumber, epiType);
            } else {
                epiLanguages = await $$.promisify(webSkel.client.listProductLangs)(productCode, epiType);
            }

            if (epiLanguages.length > 0) {
                for (let i = 0; i < epiLanguages.length; i++) {
                    let epiPayload;
                    try {
                        epiPayload = await this.retrieveEPI(productCode, batchNumber, epiLanguages[i], epiType);
                        EPIs.push(webSkel.appServices.getEpiModelObject(epiPayload, epiLanguages[i], epiType));
                    } catch (err) {
                        failedEPIs.push(`${epiType} for ${epiLanguages[i]}`);
                    }
                }
                if (failedEPIs.length > 0) {
                    let toastContent = webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve following EPI's for product code: ${productCode}. <br> Please check your network connection and configuration and try again.`, webSkel.appServices.generateMissingToastList(failedEPIs));
                    webSkel.notificationHandler.reportUserRelevantWarning(toastContent);
                }
            }
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve all EPI data for batch ${batchNumber} and product code: ${productCode}. <br> Please check your network connection and configuration and try again.`), err);
        }
        return EPIs
    }

    async retrieveEPI(productCode, batchNumber, epiLanguage, epiType) {
        if (batchNumber) {
            return await $$.promisify(webSkel.client.getBatchEPIs)(productCode, batchNumber, epiLanguage, epiType);
        } else {
            return await $$.promisify(webSkel.client.getProductEPIs)(productCode, epiLanguage, epiType);
        }

    }

}
