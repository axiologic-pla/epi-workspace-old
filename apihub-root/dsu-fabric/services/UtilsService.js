import constants from "../constants.js";

export class UtilsService{
    constructor() {
    }
     generate(charactersSet, length){
        let result = '';
        const charactersLength = charactersSet.length;
        for (let i = 0; i < length; i++) {
            result += charactersSet.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }
    dbMessageFields = ["pk", "meta", "did", "__timestamp", "$loki", "context", "keySSI", "epiProtocol", "version"];
    generateID(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return this.generate(characters, length);
    }

    generateNumericID(length) {
        const characters = '0123456789';
        return this.generate(characters, length);
    }

    generateSerialNumber(length){
        let char = this.generate("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2);
        let number = this.generateNumericID(length-char.length);
        return char+number;

    }
    cleanMessage (message)  {
        let cleanMessage = JSON.parse(JSON.stringify(message));
        this.dbMessageFields.forEach(field => {
            if (field in cleanMessage) {
                delete cleanMessage[field]
            }
        })
        return cleanMessage;
    }
    getDiffsForAudit(prevData, newData){
        if (prevData && (Array.isArray(prevData) || Object.keys(prevData).length > 0)) {
            prevData = this.cleanMessage(prevData);
            newData = this.cleanMessage(newData);

            let diffs = Object.keys(newData).reduce((diffs, key) => {
                if (JSON.stringify(prevData[key]) === JSON.stringify(newData[key])) return diffs
                return {
                    ...diffs, [key]: {oldValue: prevData[key] || "", newValue: newData[key]}
                }
            }, {})
            return diffs;
        }
    }
    getPropertyDiffViewObj(diff, property, modelLabelsMap) {
        let oldValue = diff.oldValue;
        let newValue = diff.newValue;
        if (typeof oldValue !== "string") {
            oldValue = JSON.stringify(oldValue);
        }
        if (typeof newValue !== "string") {
            newValue = JSON.stringify(newValue);
        }
        return {
            "changedProperty": modelLabelsMap[property],
            "oldValue": {"value": oldValue || " ", "directDisplay": true},
            "newValue": {"value": newValue || " ", "directDisplay": true}
        }
    }
    getPhotoDiffViewObj(diff, property, modelLabelsMap) {
        const gtinResolverUtils = gtinResolver.getMappingsUtils();
        return {
            "changedProperty": modelLabelsMap[property],
            "oldValue": {
                "value": diff.oldValue ? gtinResolverUtils.getImageAsBase64(diff.oldValue) : " ",
                "directDisplay": true
            },
            "newValue": {
                "value": diff.newValue ? gtinResolverUtils.getImageAsBase64(diff.newValue) : " ",
                "directDisplay": true
            },
            "isPhoto": true
        }
    }
    getEpiDiffViewObj(epiDiffObj) {
        let newValueLanguage = gtinResolver.Languages.getLanguageName(epiDiffObj.newValue.language);
        let oldValueLanguage = gtinResolver.Languages.getLanguageName(epiDiffObj.newValue.language);
        let changedProperty = epiDiffObj.newValue ? `${newValueLanguage}  ${epiDiffObj.newValue.type}` : `${oldValueLanguage}  ${epiDiffObj.oldValue.type}`
        return {
            "changedProperty": changedProperty,
            "oldValue": {"value": epiDiffObj.oldValue || "-", "directDisplay": !!!epiDiffObj.oldValue},
            "newValue": {
                "value": epiDiffObj.newValue && epiDiffObj.newValue.action !== "delete" ? epiDiffObj.newValue : "-",
                "directDisplay": !!!epiDiffObj.newValue || epiDiffObj.newValue.action === "delete"
            },
            "dataType": "epi"
        }
    }
    getProductDiffs(initialProduct, updatedProduct) {
        let result = [];
        try {
            let { leafletUnits, ...initialProductData } = initialProduct;
            let { leafletUnits: updatedLeafletUnits, ...updatedProductData } = updatedProduct;
            let diffs = this.getDiffsForAudit(initialProductData, updatedProductData);
            let epiDiffs = this.getDiffsForAudit(initialProduct.leafletUnits, updatedProduct.leafletUnits);
            Object.keys(diffs).forEach(key => {
                if (key === "photo") {
                    result.push(this.getPhotoDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.PRODUCT));
                    return;
                }
                result.push(this.getPropertyDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.PRODUCT));
            });
            Object.keys(epiDiffs).forEach(key => {
                result.push(this.getEpiDiffViewObj(epiDiffs[key]));
            });

        } catch (e) {
            console.log(e);
        }
        return result;
    }
}