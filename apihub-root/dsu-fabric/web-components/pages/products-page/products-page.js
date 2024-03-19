import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class ProductsPage extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.editModeLabel = this.userRights === constants.USER_RIGHTS.READ ? "View" : "View/Edit";
        this.setPaginationDefaultValues = ()=>{
            this.productsNumber = 16;
            this.disableNextBtn = true;
            this.firstElementTimestamp = 0;
            this.lastElementTimestamp = undefined;
            this.previousPageFirstElements = [];
        };
        this.setPaginationDefaultValues();
        this.loadProducts = (query) => {
            this.invalidate(async () => {
                this.products = await webSkel.appServices.getProducts(this.productsNumber, query);
                if (this.products && this.products.length > 0) {
                    if (this.products.length === this.productsNumber) {
                        this.products.pop();
                        this.disableNextBtn = false;
                    } else if (this.products.length < this.productsNumber) {
                        this.disableNextBtn = true;
                    }
                    this.lastElementTimestamp = this.products[this.products.length - 1].__timestamp;
                    this.firstElementTimestamp = this.products[0].__timestamp;
                }

            });
        };
        this.loadProducts();
    }

    createProductRowHTML(product, lastRowItem = false) {
        const createClassString = (...classNames) => {
            return classNames.filter(Boolean).join(' ');
        }
        const classCellBorder = "cell-border-bottom";
        const viewEditClass = "view-details pointer";
        return `
            <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${webSkel.sanitize(product.inventedName)}</div>
            <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${webSkel.sanitize(product.nameMedicinalProduct)}</div>
            <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${product.productCode}</div>
            <div class="${createClassString(viewEditClass, lastRowItem ? "" : classCellBorder)}" data-local-action="viewProductDetails ${product.productCode}">${this.editModeLabel}</div>
        `;
    }

    beforeRender() {
        let string = "";
        const productsCount = this.products.length;
        this.products.forEach((product, index) => {
            string += this.createProductRowHTML(product, index === productsCount - 1);
        });
        this.items = string;
    }

    afterRender() {
        let pageBody = this.element.querySelector(".page-body");
        let products = this.element.querySelector(".products-section");
        if (this.products.length === 0) {
            products.style.display = "none";
            let paginationSection = this.element.querySelector(".table-pagination");
            paginationSection.style.display = "none";
            let noData = `<div>
                                    <div class="no-data-label">
                                        There is no data on any previous product
                                    </div>
                                    <div class="no-data-instructions">
                                        Start by using the right side action (add).
                                    </div>
                                </div>`;
            pageBody.insertAdjacentHTML("beforeend", noData)
        }
        let previousBtn = this.element.querySelector("#previous");
        let nextBtn = this.element.querySelector("#next");
        if (this.previousPageFirstElements.length === 0 && previousBtn) {
            previousBtn.classList.add("disabled");
        }
        if (this.disableNextBtn && nextBtn) {
            nextBtn.classList.add("disabled");
        }
        this.searchInput = this.element.querySelector("search-input");
        if(this.searchInput){
            if(this.boundSearchProducts){
                this.searchInput.removeEventListener("search", this.boundSearchProducts);
            }
            this.boundSearchProducts = this.searchProducts.bind(this);
            this.searchInput.addEventListener("search", this.boundSearchProducts);
        }
    }

    async navigateToManageProductPage() {
        await webSkel.changeToDynamicPage("manage-product-page", "manage-product-page");
    }

    async viewProductDetails(_target, productCode) {
        await webSkel.changeToDynamicPage("manage-product-page", `manage-product-page?product-code=${productCode}`);
    }

    async searchProducts(event) {
        let formData = await webSkel.extractFormInformation(this.searchInput);
        if (formData.isValid) {
            this.inputValue = formData.data.productCode;
            this.focusInput = "true";
            this.setPaginationDefaultValues();
            let products = await webSkel.appServices.getProducts(undefined, ["__timestamp > 0", `productCode == ${this.inputValue}`]);
            if (products.length > 0) {
                this.products = products;
                this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
            } else {
                this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
            }
            this.focusInput = true;
            this.invalidate();
        }

    }

    async deleteInput(xMark) {
        this.searchResultIcon = "";
        this.inputValue = "";
        this.focusInput = "";
        this.loadProducts();
    }

    previousTablePage(_target) {
        if (!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0) {
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            this.loadProducts([`__timestamp <= ${this.firstElementTimestamp}`]);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            this.loadProducts([`__timestamp < ${this.firstElementTimestamp}`]);
        }
    }
}
