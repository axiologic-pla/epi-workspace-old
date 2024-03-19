export class AuditPage {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        if(!this.selected){
            this.tab = `<action-logs data-presenter="action-logs"></action-logs>`;
        }
    }
    afterRender(){
        let actions = this.element.querySelector("#action-logs");
        let access = this.element.querySelector("#access-logs");
        if(this.selected === "access-logs"){
            access.classList.remove("inactive");
            access.classList.add("highlighted");
        }else {
            actions.classList.remove("inactive");
            actions.classList.add("highlighted");
        }
    }
    switchTab(_target){
        this.selected = _target.getAttribute("id");

        let tabName = _target.getAttribute("id");
        this.tab = `<${tabName} data-presenter="${tabName}"></${tabName}>`;
        this.invalidate();
    }
}
