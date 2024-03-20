import {CommonPresenterClass} from "../../CommonPresenterClass.js";
import constants from "../../../constants.js";

export class BatchesPage extends CommonPresenterClass {
    constructor(element, invalidate) {
        super(element, invalidate);
        this.editModeLabel = this.userRights === constants.USER_RIGHTS.READ ? "View" : "Edit";
        this.editBatchLabel = `${this.editModeLabel} Batch`;
        this.setPaginationDefaultValues = () => {
            this.batchesNumber = 16;
            this.disableNextBtn = true;
            this.firstElementTimestamp = 0;
            this.lastElementTimestamp = undefined;
            this.previousPageFirstElements = [];
        };
        this.setPaginationDefaultValues();
        this.loadBatches = (query) => {
            this.invalidate(async () => {
                this.batches = await webSkel.appServices.getBatches(this.batchesNumber, query);
                if (this.batches && this.batches.length > 0) {
                    if (this.batches.length === this.batchesNumber) {
                        this.batches.pop();
                        this.disableNextBtn = false;
                    } else if (this.batches.length < this.batchesNumber) {
                        this.disableNextBtn = true;
                    }
                    this.lastElementTimestamp = this.batches[this.batches.length - 1].__timestamp;
                    this.firstElementTimestamp = this.batches[0].__timestamp;
                }

            });
        };
        this.loadBatches();
    }

    getFormattedDate(dateString, separator) {
        let fullDate = true;
        if (dateString.slice(4, 6) === '00') {
            fullDate = false;
            dateString = [parseInt("20" + dateString.slice(0, 2)), parseInt(dateString.slice(2, 4)), 0]
        } else {
            dateString = [parseInt("20" + dateString.slice(0, 2)), parseInt(dateString.slice(2, 4)) - 1, parseInt(dateString.slice(4, 6))];
        }
        let objectDate = new Date(dateString[0], dateString[1], dateString[2]);
        let day = objectDate.getDate();
        let month = objectDate.getMonth() + 1;
        let year = objectDate.getFullYear();
        if (day < 10) {
            day = '0' + day;
        }

        if (month < 10) {
            month = `0${month}`;
        }

        return fullDate ? `${day}${separator}${month}${separator}${year}` : `${month}${separator}${year}`;

    }

    createBatchRowHTML(batch, lastRowItem = false) {
        const createClassString = (...classNames) => {
            return classNames.filter(Boolean).join(' ');
        }
        const classCellBorder = "cell-border-bottom";
        const viewEditClass = "view-details pointer";

        return `
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${webSkel.sanitize(batch.inventedName)}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${webSkel.sanitize(batch.nameMedicinalProduct)}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${webSkel.sanitize(batch.productCode)}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${webSkel.sanitize(batch.batchNumber)}</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}><label class="date-col-label">${this.getFormattedDate(batch.expiryDate, "/")}</label><br><label class="gs1-col-label">(${batch.expiryDate})</label></div>
        <div class="${createClassString(viewEditClass, lastRowItem ? "" : classCellBorder)}" data-local-action="openDataMatrixModal" data-batch="${encodeURIComponent(JSON.stringify(batch))}">View</div>
        <div ${lastRowItem ? "" : `class="${classCellBorder}"`}>${batch.version}</div>
        <div class="${createClassString(viewEditClass, lastRowItem ? "" : classCellBorder)}"
             data-local-action="navigateToEditBatch ${batch.productCode} ${webSkel.sanitize(batch.batchNumber)}">${this.editModeLabel}</div>`
    }

    beforeRender() {
        let string = "";
        const batchesCount = this.batches.length;
        this.batches.forEach((batch, index) => {
            string += this.createBatchRowHTML(batch, index === batchesCount - 1);
        });
        this.items = string;
    }

    afterRender() {
        let pageBody = this.element.querySelector(".page-body");
        let batches = this.element.querySelector(".batches-section");
        if (this.batches.length === 0) {
            let paginationSection = this.element.querySelector(".table-pagination");
            paginationSection.style.display = "none";
            batches.style.display = "none";
            let noData = `<div>
                                    <div class="no-data-label">
                                        There is no data on any previous batch
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
        if (this.searchInput) {
            if (this.boundSearchBatches) {
                this.searchInput.removeEventListener("search", this.boundSearchBatches);
            }
            this.boundSearchBatches = this.searchBatches.bind(this);
            this.searchInput.addEventListener("search", this.boundSearchBatches);
        }
    }

    async searchBatches(event) {
        let formData = await webSkel.extractFormInformation(this.searchInput);
        if (formData.isValid) {
            this.inputValue = formData.data.productCode;
            this.setPaginationDefaultValues();
            this.focusInput = "true";
            let batches = await webSkel.appServices.getBatches(this.batchesNumber, ["__timestamp > 0", `productCode == ${this.inputValue}`]);
            if (batches.length > 0) {
                this.batches = batches;
                this.productCodeFilter = `productCode == ${this.inputValue}`;
                if (this.batches.length === this.batchesNumber) {
                    this.batches.pop();
                    this.disableNextBtn = false;
                } else if (this.batches.length < this.batchesNumber) {
                    this.disableNextBtn = true;
                }
                this.lastElementTimestamp = this.batches[this.batches.length - 1].__timestamp;
                this.firstElementTimestamp = this.batches[0].__timestamp;
                this.searchResultIcon = "<img class='result-icon' src='./assets/icons/check.svg' alt='check'>";
            } else {
                this.searchResultIcon = "<img class='result-icon rotate' src='./assets/icons/ban.svg' alt='ban'>";
            }
            this.invalidate();
        }
    }

    async deleteInput(xMark) {
        this.searchResultIcon = "";
        this.inputValue = "";
        this.focusInput = "";
        delete this.productCodeFilter;
        this.loadBatches();
    }

    async navigateToAddBatch() {
        await webSkel.changeToDynamicPage("manage-batch-page", `manage-batch-page`);
    }

    async navigateToEditBatch(_target, productCode, batchId) {
        await webSkel.changeToDynamicPage("manage-batch-page", `manage-batch-page?gtin=${productCode}&&batchId=${batchId}`);
    }

    async openDataMatrixModal(_target) {
        await webSkel.showModal("data-matrix-modal", {["batch"]: _target.getAttribute("data-batch")})
    }

    previousTablePage(_target) {
        if (!_target.classList.contains("disabled") && this.previousPageFirstElements.length > 0) {
            this.firstElementTimestamp = this.previousPageFirstElements.pop();
            this.lastElementTimestamp = undefined;
            let query = [`__timestamp <= ${this.firstElementTimestamp}`];
            if (this.productCodeFilter) {
                query.push(this.productCodeFilter);
            }
            this.loadBatches(query);
        }
    }

    nextTablePage(_target) {
        if (!_target.classList.contains("disabled")) {
            this.previousPageFirstElements.push(this.firstElementTimestamp);
            this.firstElementTimestamp = this.lastElementTimestamp;
            this.lastElementTimestamp = undefined;
            let query = [`__timestamp < ${this.firstElementTimestamp}`];
            if (this.productCodeFilter) {
                query.push(this.productCodeFilter);
            }
            this.loadBatches(query);
        }
    }
}
