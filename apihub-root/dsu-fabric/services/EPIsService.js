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

    getEPIPayload(epi, productCode, batchCode) {
        let result = webSkel.appServices.initMessage(epi.type);
        if (epi.action !== constants.EPI_ACTIONS.DELETE) {
            result.payload = {
                productCode: productCode,
                batchCode: batchCode,
                language: epi.language,
                xmlFileContent: epi.xmlFileContent,
                otherFilesContent: epi.otherFilesContent.map(payload => {
                    return {
                        filename: payload.filename,
                        fileContent: payload.fileContent.split("base64,")[1]
                    }
                }),
            };
        } else {
            result.payload = {
                productCode: productCode,
                batchCode: batchCode,
                language: epi.language
            };
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
            "productName": productData.inventedName,
            "productDescription": productData.nameMedicinalProduct,
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
        try {
            let xmlContent;
            let epiImages = {};
            for (let file of epiFiles) {
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
                webSkel.notificationHandler.reportUserRelevantError(this.getToastContent(this.generateMissingToastList(missingImgFiles)));
                return false;

            }

            let leafletHtmlImages = htmlXMLContent.querySelectorAll("img");
            let htmlImageNames = Array.from(leafletHtmlImages).map(img => img.getAttribute("src"));
            //removing from validation image src that are data URLs ("data:....")
            htmlImageNames = htmlImageNames.filter((imageSrc) => {
                let dataUrlRegex = new RegExp(/^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i);
                if (!!imageSrc.match(dataUrlRegex) || imageSrc.startsWith("data:")) {
                    return false;
                }
                return true;
            });
            let uploadedImageNames = Object.keys(epiImages);
            let differentCaseImgFiles = [];
            let missingImgFiles = []
            htmlImageNames.forEach(imgName => {
                if (!epiImages[imgName]) {
                    let differentCaseImg = uploadedImageNames.find((item) => item.toLowerCase() === imgName.toLowerCase())
                    if (differentCaseImg) {
                        differentCaseImgFiles.push({xmlName: imgName, fileName: differentCaseImg});
                    } else {
                        missingImgFiles.push(imgName);
                    }
                }
            })

            if (missingImgFiles.length > 0) {
                webSkel.notificationHandler.reportUserRelevantError(this.getToastContent(this.generateMissingToastList(missingImgFiles)));
                return false;
            }
            if (differentCaseImgFiles.length > 0) {
                webSkel.notificationHandler.reportUserRelevantWarning(this.getToastContent(this.generateDifferentCaseToastList(differentCaseImgFiles)));
            }
            return true;
        } catch (e) {
            console.log("EPI files validation fails: ", e);
            webSkel.notificationHandler.reportUserRelevantError("Attention: uploaded files format is not supported. To proceed successfully verify that you have an XML file and your XML file adheres to the prescribed format and structure. To obtain the correct XML specifications we recommend consulting our documentation. Thank you! ");
            return false;
        }

    }
}
