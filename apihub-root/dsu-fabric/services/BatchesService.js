import bwipjs from "../cloned-dependecies/bwip.js";
//TODO: CODE-REVIEW - bwipjs is a helper or an external library/dependency??

const TWO_D_BARCODES = ["datamatrix", "gs1datamatrix", "qrcode"];

export class BatchesService {
    constructor() {}

    charsMap = {
        "33": "!",
        "34": '"',
        "35": "#",
        "36": "$",
        "37": "%",
        "38": "&",
        "39": "'",
        "40": "(",
        "41": ")",
        "42": "*",
        "43": "+",
        "45": "-",
        "46": ".",
        "47": "/",
        "58": ":",
        "59": ";",
        "60": "<",
        "61": "=",
        "62": ">",
        "63": "?",
        "64": "@",
        "91": "[",
        "92": "\\",
        "93": "]",
        "94": "^",
        "95": "_",
        "96": "`",
        "123": "{",
        "124": "|",
        "125": "}",
        "126": "~"
    }

    bwipjsEscape(data) {
        let resultData = data.split("").map(char => {
            if (this.charsMap[char.charCodeAt(0)]) {
                return char.charCodeAt(0) >= 100 ? `^${char.charCodeAt(0)}` : `^0${char.charCodeAt(0)}`
            } else {
                return char;
            }
        }).join("")
        return resultData;
    }

    sanitizeCode(code) {
        return code.replace(/"/g, "\\\"");
    }

    drawQRCodeCanvas(model, element) {
        if (model.barcodeData.length > 0) {
            let canvas = element.querySelector("canvas");
            canvas.innerHTML = "";

            let tryToGenerateBarcode = () => {
                if (bwipjs) {
                    try {
                        let options = {
                            bcid: model.barcodeType || "qrcode",      // Barcode type
                            text: model.barcodeData,      // Text to encode
                            scale: 3,             // 3x scaling factor
                            height: model.barcodeSize || 32,    // Bar height, in millimeters
                            textxalign: 'center', // Always good to set this
                        }

                        if (model.includeBarcodeText) {
                            options['alttext'] = model.barcodeData;
                        }

                        if (TWO_D_BARCODES.indexOf(model.barcodeType) !== -1) {
                            options['width'] = model.barcodeSize;
                        }

                        // @ts-ignore
                        bwipjs.toCanvas(canvas, options, function (err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    } catch (e) {
                        // most commonly errors come from wrong input data format
                        console.log(e)
                    }

                } else {
                    setTimeout(tryToGenerateBarcode, 100);
                }
            }
            tryToGenerateBarcode();
        }
    }

    generateSerializationForBatch(batch, serialNumber, element) {
        let barcodeData;
        if (serialNumber === "" || typeof serialNumber === "undefined") {
            barcodeData = `(01)${batch.productCode}(10)${batch.batch}(17)${batch.expiryDate}`;
        } else {
            barcodeData = `(01)${batch.productCode}(21)${this.bwipjsEscape(serialNumber)}(10)${this.bwipjsEscape(batch.batch)}(17)${batch.expiryDate}`;
        }
        barcodeData = this.sanitizeCode(barcodeData);
        let model = {
            barcodeData: barcodeData,
            barcodeType: "gs1datamatrix",
            barcodeSize: 16,
            includeBarcodeText: false
        };
        this.drawQRCodeCanvas(model, element);
    }

    async addBatch(batchData,EPIs){
        const batchValidationResult = this.validateBatch(batchData)
        if (batchValidationResult.valid) {
            await $$.promisify(webSkel.client.addBatch)(batchData.productCode, batchData.batchNumber, batchData);
            for(const EPI of EPIs){
                 const EPIPayload=webSkel.appServices.createEPIPayload(EPI,batchData);
                await $$.promisify(webSkel.client.addEPI)(batchData.productCode,batchData.batchNumber,EPIPayload)
            }
            return true;
        } else {
            /* TODO Replace console error logging with toasts */
            console.error(batchValidationResult.message);
            return false;
        }
    }
    createBatchPayload(batchData) {
        return {
            "productCode": batchData.productCode,
            "batch": batchData.batchNumber,
            "packagingSiteName": batchData.packagingSiteName,
            "expiryDate": batchData.expiryDate
        }
    }

    validateBatch(batchObj) {
        if (!batchObj.productCode) {
            return {valid: false, message: 'Product code is a mandatory field'};

        }
        if (!batchObj.batchNumber) {
            return {valid: false, message: 'Batch number is a mandatory field'};
        }

        if (!/^[A-Za-z0-9]{1,20}$/.test(batchObj.batchNumber)) {
            return {
                valid: false,
                message: 'Batch number can contain only alphanumeric characters and a maximum length of 20'
            };
        }

        if (!batchObj.expiryDate) {
            return {valid: false, message: 'Expiration date is a mandatory field'};
        }

        return {valid: true, message: ''};
    }
}
