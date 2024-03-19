import {CommonPresenterClass} from "../../CommonPresenterClass.js";

export class DialogModal extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);

        this.message = this.element.variables["data-message"];
        this.header = this.element.variables["data-header"];
        this.denyButtonText = this.element.variables["data-denybuttontext"];
        this.acceptButtonText = this.element.variables["data-acceptbuttontext"];

        this.invalidate();
    }

    beforeRender(){

    }

    deny(_target){
        webSkel.closeModal(_target, false);
    }

    accept(_target){
       webSkel.closeModal(_target, true);
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
    closeModal(_target) {
        webSkel.closeModal(_target);
    }
}