import {CommonPresenterClass} from "../../CommonPresenterClass.js";
export class SearchInput extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.inputName = this.element.getAttribute("data-input");
        this.searchResultIcon = this.element.getAttribute("data-result-icon");
        this.focusInput = this.element.getAttribute("data-focus");
        this.placeholder= this.element.getAttribute("data-placeholder");
        this.invalidate();
    }

    beforeRender() {

    }
    afterRender() {
        this.searchInput = this.element.querySelector(`#${this.inputName}`);
        this.searchInputContainer = this.element.querySelector(".input-container");
        this.searchInput.value = this.element.getAttribute("data-value");
        let xMark = this.element.querySelector(".x-mark");

        if (this.boundFnKeypress) {
            this.searchInput.removeEventListener("keypress", this.boundFnKeypress);
        }
        this.boundFnKeypress = this.search.bind(this);
        this.searchInput.addEventListener("keypress", this.boundFnKeypress);

        if (this.boundFnMouseLeave) {
            this.searchInputContainer.removeEventListener("mouseleave", this.boundFnMouseLeave);
        }
        this.boundFnMouseLeave = this.hideXMark.bind(this, xMark);
        this.searchInputContainer.addEventListener("mouseleave", this.boundFnMouseLeave);

        if (this.boundFnMouseEnter) {
            this.searchInputContainer.removeEventListener("mouseenter", this.boundFnMouseEnter);
        }
        this.boundFnMouseEnter = this.showXMark.bind(this, xMark);
        this.searchInputContainer.addEventListener("mouseenter", this.boundFnMouseEnter);

        if (this.boundFnFocusout) {
            this.searchInput.removeEventListener("focusout", this.boundFnFocusout);
        }
        this.boundFnFocusout = this.removeFocus.bind(this, xMark);
        this.searchInput.addEventListener("focusout", this.boundFnFocusout);

        if (this.boundFnInput) {
            this.searchInput.removeEventListener("input", this.boundFnInput);
        }
        this.boundFnInput = this.toggleSearchIcons.bind(this, xMark);
        this.searchInput.addEventListener("input", this.boundFnInput);

        if (this.focusInput) {
            this.searchInput.focus();
            xMark.style.display = "block";
            this.focusInput = false;
        }
    }
    toggleSearchIcons(xMark, event) {
        if (this.searchInput.value === "") {
            xMark.style.display = "none";
        } else {
            xMark.style.display = "block";
        }
    }

    removeFocus(xMark, event) {
        if(event.relatedTarget !== xMark){
            xMark.style.display = "none";
        }
    }

    showXMark(xMark, event) {
        if (this.searchInput.value !== "") {
            xMark.style.display = "block";
        }
    }

    hideXMark(xMark, event) {
        if (document.activeElement !== this.searchInput) {
            xMark.style.display = "none";
        }
    }

    search(event){
        if (event.key === "Enter") {
            event.preventDefault();
            let searchEvent = new Event('search', {
                bubbles: true,
                cancelable: true
            });
            this.element.dispatchEvent(searchEvent);
        }
    }
}