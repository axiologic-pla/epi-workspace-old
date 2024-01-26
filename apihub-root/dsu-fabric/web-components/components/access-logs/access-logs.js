export class AccessLogs {
    constructor(element,invalidate){
        this.element=element;
        this.invalidate=invalidate;
        this.invalidate();
    }
    beforeRender(){
        this.logs = [{
            userId: "devuser",
            action: "Access wallet",
            userDID: "did:ssi:name:vault:DSU_Fabric/devuser",
            userGroup: "ePI_Write_Group",
            isoDate: "2024-01-23T13:28:17.706Z"
        }];
        let string = "";
        for(let item of this.logs){
            string += ` <div>${item.userId}</div>
                        <div>${item.action}</div>
                        <div>${item.userDID}</div>
                        <div>${item.userGroup}</div>
                        <div>${item.isoDate}</div>`;
        }
        this.items = string;
    }
    afterRender(){
        this.searchInput = this.element.querySelector("#userId");
        this.searchInput.value = this.inputValue || "";
        let xMark = this.element.querySelector(".x-mark");

        if(this.boundFnKeypress){
            this.searchInput.removeEventListener("keypress", this.boundFnKeypress);
        }
        this.boundFnKeypress= this.searchLog.bind(this);
        this.searchInput.addEventListener("keypress", this.boundFnKeypress);

        if(this.boundFnMouseLeave){
            this.searchInput.removeEventListener("mouseleave", this.boundFnMouseLeave);
        }
        this.boundFnMouseLeave = this.hideXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseleave", this.boundFnMouseLeave);

        if(this.boundFnMouseEnter){
            this.searchInput.removeEventListener("mouseenter", this.boundFnMouseEnter);
        }
        this.boundFnMouseEnter = this.showXMark.bind(this, xMark);
        this.searchInput.addEventListener("mouseenter", this.boundFnMouseEnter);

        if(this.boundFnFocusout){
            this.searchInput.removeEventListener("focusout", this.boundFnFocusout);
        }
        this.boundFnFocusout = this.removeFocus.bind(this, xMark);
        this.searchInput.addEventListener("focusout", this.boundFnFocusout);

        if(this.boundFnInput){
            this.searchInput.removeEventListener("input", this.boundFnInput);
        }
        this.boundFnInput = this.toggleSearchIcons.bind(this, xMark);
        this.searchInput.addEventListener("input", this.boundFnInput);

        if(this.focusInput){
            this.searchInput.focus();
            xMark.style.display = "block";
            this.focusInput = false;
        }
    }
    toggleSearchIcons(xMark, event){
        if(this.searchInput.value === ""){
            xMark.style.display = "none";
        }else {
            xMark.style.display = "block";
        }
    }
    removeFocus(xMark, event){
        xMark.style.display = "none";
    }
    showXMark(xMark, event){
        if(this.searchInput.value !== ""){
            xMark.style.display = "block";
        }
    }
    hideXMark(xMark, event){
        if(document.activeElement !== this.searchInput){
            xMark.style.display = "none";
        }
    }
    async searchLog(event){
        if(event.key === "Enter"){
            event.preventDefault();
            let formData = await webSkel.UtilsService.extractFormInformation(this.searchInput);
            if(formData.isValid){
                this.inputValue = formData.data.userId;
                let logs = await $$.promisify(webSkel.client.filterAuditLogs)(undefined, undefined, [`userId == ${this.inputValue}`]);
                if(logs.length > 0){
                    this.logs = logs;
                    this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
                }else {
                    this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
                }
                this.focusInput = true;
                this.invalidate();
            }
        }
    }
    async deleteInput(xMark){
        this.searchResultIcon = "";
        delete this.inputValue;
        this.invalidate(async ()=>{
            this.products = await $$.promisify(webSkel.client.listProducts)(undefined);
            this.batches = await $$.promisify(webSkel.client.listBatches)(undefined);
        });
    }
}