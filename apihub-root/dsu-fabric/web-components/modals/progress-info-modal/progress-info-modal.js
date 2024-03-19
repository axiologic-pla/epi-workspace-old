export class ProgressInfoModal {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.message = this.element.variables["data-message"];
        this.header = this.element.variables["data-header"];
        this.invalidate();
    }

    beforeRender(){
    }

}