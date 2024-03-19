import {copyToClipboard} from "../../../utils/utils.js"

export class GenerateDidPage {
  constructor(element, invalidate) {
    this.element = element;
    this.invalidate = invalidate;
    this.invalidate();
  }

  beforeRender() {
    if (this.element.variables["data-did"]) {
      this.did = this.element.variables["data-did"];
    }
  }

  async copyText() {
    copyToClipboard(this.did)
  }
}
