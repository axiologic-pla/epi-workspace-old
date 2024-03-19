export class CommonPresenterClass {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.userRights = webSkel.userRights;
        this.readOnlyLabel = this.userRights === "readonly" ? "Read only mode" : ""
    }

    beforeRender() {
    }

    afterRender() {
    }
}
