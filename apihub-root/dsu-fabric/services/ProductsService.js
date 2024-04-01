import constants from "../constants.js";
import {navigateToPage} from "../utils/utils.js";

export class ProductsService {
    constructor() {

    }

    productInputFieldNames() {
        return [
            "productCode",
            "inventedName",
            "nameMedicinalProduct",
            "internalMaterialCode"/*,
            "patientLeafletInfo"*/
        ]
    }

    createNewProduct(product = {}, image = "", epiUnits = []) {
        let productObj = {};
        for (let key of this.productInputFieldNames()) {
            productObj[key] = product[key] || "";
        }
        productObj.photo = image;
        productObj.epiUnits = JSON.parse(JSON.stringify(epiUnits));
        productObj.strengthUnits = product.strengths || [];
        productObj.marketUnits = product.markets || [];
        productObj.productVersion = product.version || 0;
        return productObj;
    }

    removeMarkedForDeletion(key, value) {
        if (key === "epiUnits" || key === "marketUnits" || key === "strengthUnits") {
            return value.filter(unit => !unit.action || unit.action !== "delete");
        } else {
            return value;
        }
    }

    cleanUnitsForPayload(units) {
        return units.filter(unit => unit.action !== "delete").map(unitItem => {
            delete unitItem.action;
            delete unitItem.id
            return unitItem
        })

    }

    getProductPayload(productData) {
        let clone = JSON.parse(JSON.stringify(productData));
        let result = webSkel.appServices.initMessage(constants.API_MESSAGE_TYPES.PRODUCT);
        result.payload = {
            productCode: clone.productCode,
            internalMaterialCode: clone.internalMaterialCode,
            inventedName: clone.inventedName,
            nameMedicinalProduct: clone.nameMedicinalProduct,
            strengths: this.cleanUnitsForPayload(clone.strengthUnits),
            markets: this.cleanUnitsForPayload(clone.marketUnits)
            /*,
            patientLeafletInfo: productData.patientLeafletInfo*/
        };
        return result;
    }

    getPhotoPayload(productData) {
        const regex = /\/([^\/;]+);/;
        const match = productData.photo.match(regex);
        let imageType;
        if (match) {
            imageType = match[1];
        } else {
            imageType = "unknown";
        }
        let result = webSkel.appServices.initMessage(constants.API_MESSAGE_TYPES.PRODUCT_PHOTO);
        result.payload = {
            productCode: productData.productCode,
            imageId: webSkel.appServices.generateNumericID(12),
            imageType: "front",
            imageFormat: imageType,
            imageData: productData.photo
        };
        return result;
    }

    async retrieveProductPayload(productCode) {
        let productPayload;

        await this.checkProductStatus(productCode, true);

        try {
            productPayload = await $$.promisify(webSkel.client.getProductMetadata)(productCode);
            delete productPayload.pk;
            delete productPayload.__version;
            delete productPayload.__timestamp;

            if (productPayload.strengths) {
                productPayload.strengths = productPayload.strengths.map(item => {
                    item.id = webSkel.appServices.generateID(16);
                    return item
                });
            }

            if (productPayload.markets) {
                productPayload.markets = productPayload.markets.map(item => {
                    item.id = webSkel.appServices.generateID(16);
                    return item
                })
            }
            return productPayload
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve data for product code: ${productCode}. <br> Please check your network connection and configuration and try again.`), err);
            await navigateToPage("home-page");
            return
        }

    }

    async retrieveProductPhotoPayload(productCode, version) {
        let productPhotoPayload;
        try {
            productPhotoPayload = await $$.promisify(webSkel.client.getImage)(productCode, version);
        } catch (err) {
            if (err.rootCause !== "missingData") {
                webSkel.notificationHandler.reportUserRelevantWarning(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve image for product code: ${productCode}. <br> Please check your network connection and configuration and try again.`), err);
            }
        }
        return productPhotoPayload;
    }

    async getProductData(productCode) {
        let productPayload = await this.retrieveProductPayload(productCode);
        let productPhotoPayload = await this.retrieveProductPhotoPayload(productCode)

        let leafletEPIs = await webSkel.appServices.retrieveEPIs(productCode, undefined, constants.API_MESSAGE_TYPES.EPI.LEAFLET);
        let smpcEPIs = await webSkel.appServices.retrieveEPIs(productCode, undefined, constants.API_MESSAGE_TYPES.EPI.SMPC);
        let EPIs = [...leafletEPIs, ...smpcEPIs];
        return {productPayload, productPhotoPayload, EPIs}
    }

    async saveProductPhoto(productData, updatedPhoto, isUpdate) {
        try {
            if (isUpdate && updatedPhoto !== productData.photo) {
                let photoDetails = this.getPhotoPayload(productData)
                await $$.promisify(webSkel.client.updateImage)(productData.productCode, photoDetails);
            }
            if (!isUpdate && productData.photo) {
                let photoDetails = this.getPhotoPayload(productData)
                await $$.promisify(webSkel.client.addImage)(productData.productCode, photoDetails);
            }
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't save Product Photo <br> ${webSkel.appServices.getErrDetails(err)}`), err);

        }
    }

    async checkProductStatus(gtin, preventMyObjectWarning) {
        let productStatus;
        try {
            productStatus = await $$.promisify(webSkel.client.objectStatus)(gtin);
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't get status for product code: ${gtin}. <br> Please check your network connection and configuration and try again.`), err);
            return;
        }
        if (productStatus === constants.OBJECT_AVAILABILITY_STATUS.MY_OBJECT) {
            if (!preventMyObjectWarning) {
                webSkel.notificationHandler.reportUserRelevantWarning("The product code already exists and is being updated!!!");
            }
        }
        if (productStatus === constants.OBJECT_AVAILABILITY_STATUS.EXTERNAL_OBJECT) {
            webSkel.notificationHandler.reportUserRelevantError('Product code validation failed. Provided product code is already used.');
            return;
        }

        if (productStatus === constants.OBJECT_AVAILABILITY_STATUS.RECOVERY_REQUIRED) {
            let accept = await webSkel.showModal("dialog-modal", {
                header: "Action required",
                message: "Product version needs recovery. Start the recovery process?",
                denyButtonText: "Cancel",
                acceptButtonText: "Proceed"
            }, true);
            if (accept) {
                let modal;
                try {
                    modal = await webSkel.showModal("progress-info-modal", {
                        header: "Info",
                        message: "Recover process in progress..."
                    });
                    await $$.promisify(webSkel.client.recover)(gtin);
                } catch (err) {
                    webSkel.notificationHandler.reportUserRelevantError('Product recovery process failed.');
                    return;
                }
                if (modal) {
                    await webSkel.closeModal(modal);
                }
                webSkel.notificationHandler.reportUserRelevantWarning("Product recovery success.");
            }
        }
    }

    async saveProduct(productData, updatedPhoto, isUpdate, skipMetadataUpdate = false) {

        let modal = await webSkel.showModal("progress-info-modal", {
            header: "Info",
            message: "Saving Product..."
        });

        await this.checkProductStatus(productData.productCode, isUpdate);

        if (!skipMetadataUpdate) {
            try {
                let productDetails = this.getProductPayload(productData);
                if (isUpdate) {
                    await $$.promisify(webSkel.client.updateProduct)(productData.productCode, productDetails);
                } else {
                    await $$.promisify(webSkel.client.addProduct)(productData.productCode, productDetails);
                }
            } catch (err) {
                await webSkel.closeModal(modal);
                webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't update data for product code: ${productData.productCode}. <br> ${webSkel.appServices.getErrDetails(err)}`), err);
                return;
            }
        }
        try {
            await webSkel.appServices.executeEPIActions(productData.epiUnits, productData.productCode);
            await this.saveProductPhoto(productData, updatedPhoto, isUpdate);
        } catch (err) {
            await webSkel.closeModal(modal);
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't update data for product code: ${productData.productCode}. <br> ${webSkel.appServices.getErrDetails(err)}`), err);
            return;
        }
        await webSkel.closeModal(modal);

        await navigateToPage("products-page");
    }

    getMarketDiffViewObj(marketDiffObj) {
        let newValueCountry = "";
        if (marketDiffObj.newValue) {
            newValueCountry = gtinResolver.Countries.getCountry(marketDiffObj.newValue.marketId);
            delete marketDiffObj.newValue.id
        }
        let oldValueCountry = "";
        if (marketDiffObj.oldValue) {
            oldValueCountry = gtinResolver.Countries.getCountry(marketDiffObj.oldValue.marketId);
            delete marketDiffObj.oldValue.id
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

    getStrengthDiffViewObj(strengthDiffsObj) {
        delete strengthDiffsObj.oldValue.id
        delete strengthDiffsObj.newValue.id
        return {
            "changedProperty": strengthDiffsObj.newValue ? `${strengthDiffsObj.newValue.substance} Strength` : `${strengthDiffsObj.oldValue.substance} `,
            "oldValue": {"value": strengthDiffsObj.oldValue || "-", "directDisplay": !!!strengthDiffsObj.oldValue},
            "newValue": {
                "value": strengthDiffsObj.newValue && strengthDiffsObj.newValue.action !== "delete" ? strengthDiffsObj.newValue : "-",
                "directDisplay": !!!strengthDiffsObj.newValue || strengthDiffsObj.newValue.action === "delete"
            },
            "dataType": "strength"
        }
    }

    getProductDiffs(initialProduct, updatedProduct) {
        let result = [];
        try {
            let {epiUnits, marketUnits, strengthUnits, ...initialProductData} = initialProduct;
            let {
                epiUnits: updatedLeafletUnits,
                marketUnits: updatedMarketUnits,
                strengthUnits: updatedStrengthUnits,
                ...updatedProductData
            } = updatedProduct;
            let diffs = webSkel.appServices.getDiffsForAudit(initialProductData, updatedProductData);
            let epiDiffs = webSkel.appServices.getDiffsForAudit(initialProduct.epiUnits, updatedProduct.epiUnits);
            let marketDiffs = webSkel.appServices.getDiffsForAudit(initialProduct.marketUnits, updatedProduct.marketUnits);
            let strengthDiffs = webSkel.appServices.getDiffsForAudit(initialProduct.strengthUnits, updatedProduct.strengthUnits);
            if (Object.keys(diffs).length > 0 || Object.keys(marketDiffs).length > 0 || Object.keys(strengthDiffs).length > 0) {
                result.needsMetadataUpdate = true;
            }

            if (Object.keys(diffs).length === 1 && diffs.photo) {
                result.needsMetadataUpdate = false;
            }

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
            Object.keys(strengthDiffs).forEach(key => {
                result.push(this.getStrengthDiffViewObj(strengthDiffs[key]));
            });

        } catch (e) {
            console.log(e);
        }
        return result;
    }

    async getProducts(number = undefined, query = undefined, sortDirection = "desc") {
        let result = [];
        try {
            result = await $$.promisify(webSkel.client.listProducts)(undefined, number, query, sortDirection);
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError(webSkel.appServices.getToastListContent(`Something went wrong!!!<br> Couldn't retrieve products. <br> Please check your network connection and configuration and try again.`), err);
        }
        return result
    }

}
