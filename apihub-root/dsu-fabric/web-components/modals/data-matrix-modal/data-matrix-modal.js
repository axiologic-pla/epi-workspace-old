export class DataMatrixModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.productCode = this.element.variables["data-product-code"];
        this.batchNumber = this.element.variables["data-batch-number"];
        this.invalidate(async ()=>{
            this.batch = await $$.promisify(webSkel.client.getBatchMetadata)(this.productCode, this.batchNumber);
        });
    }

    beforeRender(){
    }
    afterRender(){
        webSkel.appServices.generateSerializationForBatch(this.batch, this.batch.serialNumber, this.element);
    }
    closeModal(_target) {
        webSkel.closeModal(_target);
    }


    switchModalView(){
        let modal = webSkel.getClosestParentElement(this.element,"dialog");
        if(!modal.getAttribute("data-expanded")){
            modal.setAttribute("data-expanded", "true")
            modal.style.width = "95%";
            modal.style.maxWidth = "95vw";
            this.element.style.marginLeft = "0";
        }else {
            modal.removeAttribute("data-expanded");
            modal.style.width = "75%";
            modal.style.maxWidth = "75vw";
            this.element.style.marginLeft = "240px";
        }
    }
}