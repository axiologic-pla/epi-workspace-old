import constants from "../constants.js"

export class AuditService {
    constructor() {
    }

    objectToArray(item, type) {

        if (type === "action") {
            return [`'${item.itemCode}'`, item.batchNumber ? `'${item.batchNumber}'` : "-", item.reason, item.username ? `'${item.username}'` : "", new Date(item.__timestamp).toISOString(), JSON.stringify(item.details)];
        }

        if (type === "access") {
            return [item.username ? `'${item.username}'` : "", "Access Wallet", item.userDID, item.userGroup, new Date(item.__timestamp).toISOString()];

        }
        /*  let details = {logInfo: itemCopy};
          arr.push(JSON.stringify(details));*/
        return arr;
    }

    convertToCSV(items, type) {
        let headers;
        if (type === "action") {
            headers = ["Product Code", "Batch number", "Reason", "User", "Creation Time", "Data"];
        }
        if (type === "access") {
            headers = ["User", "Action", "User DID", "User Group", "Creation Time"];
        }
        let columnTitles = headers.join(";") + "\n";
        let rows = "";
        for (let item of items) {
            item = this.objectToArray(item, type).join(";");
            rows += item + "\n";
        }
        return [columnTitles + rows];
    }

    async addAccessLog(did) {
        let auditDetails = {
            payload: {
                userDID: did,
                userGroup: window.currentGroup
            }
        }

        await $$.promisify(webSkel.client.addAuditLog)(constants.AUDIT_LOG_TYPES.USER_ACCESS, auditDetails);

    }

}
