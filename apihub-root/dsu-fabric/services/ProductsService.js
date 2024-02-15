import constants from "../constants.js";

export class ProductsService {
    constructor() {
    }
    async getProductData(productCode) {
        let productPayload = await $$.promisify(webSkel.client.getProductMetadata)(productCode);
        delete productPayload.pk;
        delete productPayload.__version;
        delete productPayload.__timestamp;
        let productPhotoPayload = await $$.promisify(webSkel.client.getImage)(productCode);
        let EPIs = [];
        let languages = await $$.promisify(webSkel.client.listProductLangs)(productCode);
        if (languages && languages.length > 0) {
            for (let i = 0; i < languages.length; i++) {
                let EPIPayload = await $$.promisify(webSkel.client.getProductEPI)(productCode, languages[i]);
                let EPIFiles = [EPIPayload.xmlFileContent, ...EPIPayload.otherFilesContent];
                let EPIObj = {
                    id: webSkel.appServices.generateID(16),
                    language: EPIPayload.language,
                    xmlFileContent: EPIPayload.xmlFileContent,
                    otherFilesContent: EPIPayload.otherFilesContent,
                    filesCount: EPIFiles.length,
                    type: EPIPayload.type
                };
                EPIs.push(EPIObj);
            }
        }

        return {productPayload, productPhotoPayload, EPIs}
    }

    async addProduct(productData) {
        let productDetails = webSkel.appServices.getProductPayload(productData);
        await $$.promisify(webSkel.client.addProduct)(productData.productCode, productDetails);
        if (productData.photo) {
            let photoDetails = webSkel.appServices.getPhotoPayload(productData)
            await $$.promisify(webSkel.client.addImage)(productData.productCode, photoDetails);
        }
        for (let epi of productData.epiUnits) {
            let epiDetails = webSkel.appServices.getEPIPayload(epi, productData.productCode);
            await $$.promisify(webSkel.client.addProductEPI)(productData.productCode, epiDetails);
        }
    }

    async updateProduct(productData, existingEpiUnits) {
        let productDetails = webSkel.appServices.getProductPayload(productData);
        await $$.promisify(webSkel.client.updateProduct)(productData.productCode, productDetails);
        if (productData.photo) {
            let photoDetails = webSkel.appServices.getPhotoPayload(productData)
            await $$.promisify(webSkel.client.updateImage)(productData.productCode, photoDetails);
        }
        for (let epi of productData.epiUnits) {
            let epiDetails = webSkel.appServices.getEPIPayload(epi, productData.productCode);
            if (epi.action === constants.EPI_ACTIONS.ADD) {
                await $$.promisify(webSkel.client.addProductEPI)(productData.productCode, epiDetails);
            }
            if (epi.action === constants.EPI_ACTIONS.UPDATE) {
                await $$.promisify(webSkel.client.updateProductEPI)(productData.productCode, epiDetails);
            }
            if (epi.action === constants.EPI_ACTIONS.DELETE) {
                await $$.promisify(webSkel.client.deleteProductEPI)(productData.productCode, epiDetails);
            }
        }
    }

    getMarketDiffViewObj(marketDiffObj) {
        let newValueCountry = "";
        if (marketDiffObj.newValue) {
            newValueCountry = gtinResolver.Countries.getCountry(marketDiffObj.newValue.country);
        }
        let oldValueCountry = "";
        if (marketDiffObj.oldValue) {
            oldValueCountry = gtinResolver.Countries.getCountry(marketDiffObj.oldValue.country);
        }

        let changedProperty = marketDiffObj.newValue ? `${newValueCountry}  Market` : `${oldValueCountry}  Market`
        return {
            "changedProperty": changedProperty,
            "oldValue": {"value": marketDiffObj.oldValue || "-", "directDisplay": !!!marketDiffObj.oldValue},
            "newValue": {
                "value": marketDiffObj.newValue && marketDiffObj.newValue.action !== "delete" ? marketDiffObj.newValue : "-",
                "directDisplay": !!!marketDiffObj.newValue || marketDiffObj.newValue.action === "delete"
            },
            "dataType": "market"
        }
    }

    getProductDiffs(initialProduct, updatedProduct) {
        let result = [];
        try {
            let {epiUnits, marketUnits, ...initialProductData} = initialProduct;
            let {
                epiUnits: updatedLeafletUnits,
                marketUnits: updatedMarketUnits,
                ...updatedProductData
            } = updatedProduct;
            let diffs = webSkel.appServices.getDiffsForAudit(initialProductData, updatedProductData);
            let epiDiffs = webSkel.appServices.getDiffsForAudit(initialProduct.epiUnits, updatedProduct.epiUnits);
            let marketDiffs = webSkel.appServices.getDiffsForAudit(initialProduct.marketUnits, updatedProduct.marketUnits);
            Object.keys(diffs).forEach(key => {
                if (key === "photo") {
                    result.push(webSkel.appServices.getPhotoDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.PRODUCT));
                    return;
                }
                result.push(webSkel.appServices.getPropertyDiffViewObj(diffs[key], key, constants.MODEL_LABELS_MAP.PRODUCT));
            });
            Object.keys(epiDiffs).forEach(key => {
                result.push(webSkel.appServices.getEpiDiffViewObj(epiDiffs[key]));
            });
            Object.keys(marketDiffs).forEach(key => {
                result.push(this.getMarketDiffViewObj(marketDiffs[key]));
            });

        } catch (e) {
            console.log(e);
        }
        return result;
    }
}
