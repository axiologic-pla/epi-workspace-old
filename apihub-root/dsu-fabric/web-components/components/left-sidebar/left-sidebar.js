import {changeSidebarFromURL} from "../../../utils/utils.js";

export class LeftSidebar {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.selectedSidebarItem = this.element.getAttribute('data-sidebar-selection');
        this.invalidate();

    }

    beforeRender() {
    }

    afterRender() {
        if(this.selectedSidebarItem){
            const desiredSidebarSelection = this.element.querySelector(`[data-id="${this.selectedSidebarItem}"]`);
            if (desiredSidebarSelection) {
                this.activateSidebarSelection(desiredSidebarSelection);
            }
        } else {
            changeSidebarFromURL();
        }
    }



    activateSidebarSelection(clickTargetElement) {
        const oldSidebarSelection = this.element.querySelector('#active-menu-item');
        if (oldSidebarSelection) {
            oldSidebarSelection.removeAttribute('id');
        }
        const newSidebarSelection = clickTargetElement;
        newSidebarSelection.id = "active-menu-item";
        return newSidebarSelection.getAttribute('data-id');
    }

    async navigateToPage(clickTargetElement) {
        const webComponentPage = this.activateSidebarSelection(clickTargetElement);
        await webSkel.changeToDynamicPage(`${webComponentPage}`, `${webComponentPage}`);
    }
}