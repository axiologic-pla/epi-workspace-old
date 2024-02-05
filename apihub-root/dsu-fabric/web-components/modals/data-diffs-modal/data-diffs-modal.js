export class DataDiffsModal{
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.diffs = JSON.parse(decodeURIComponent(this.element.getAttribute("data-diffs")));
        this.invalidate();
    }

    beforeRender(){
        let stringHTML = "";
        for (let diff of this.diffs){
            stringHTML += `
                        <div class="cell border">${diff.changedProperty}</div>
                        <div class="cell border">${diff.oldValue.value}</div>
                        <div class="cell">${diff.newValue.value}</div>
            `;
        }
        this.rows = stringHTML;
    }
    afterRender(){
    }
    closeModal(_target) {
        webSkel.UtilsService.closeModal(_target);
    }
    switchModalView(){
        let modal = webSkel.UtilsService.getClosestParentElement(this.element,"dialog");
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