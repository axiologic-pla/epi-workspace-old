import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class StrengthsTab extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.invalidate();
        this.strengths = JSON.parse(decodeURIComponent(this.element.getAttribute("data-units"))) || [];
    }

    beforeRender() {
        let stringHTML = "";
        if (this.strengths.length > 0 && !this.strengths.every(strength => strength.action === "delete")) {
            for (let strength of this.strengths) {
                if (strength.action === "delete") {
                    continue;
                }
                stringHTML += `<div class="strength-unit" data-id="${strength.id}">
                                <div class="strength-details">${strength.substance ? webSkel.sanitize(strength.substance) + ' - ' : ''}${webSkel.sanitize(strength.strength)}</div>
                                ${this.userRights === constants.USER_RIGHTS.WRITE ? `<div class="delete-button pointer" data-local-action="deleteStrength">
                                        <img class="strength-img" src="./assets/icons/thrash.svg" alt="thrash">
                                    </div>` : ''
                }   
                              </div>`;
            }
        } else {
            stringHTML = `<div class="no-data">No strengths added yet</div>`;
        }
        this.strengthUnits = stringHTML;
    }

    afterRender() {

    }

}
