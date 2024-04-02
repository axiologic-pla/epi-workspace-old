import constants from "./../constants.js";
import {navigateToPage, getCurrentPageTag} from "./../utils/utils.js";

const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");
const defaultHandler = function () {
    console.log("User is authorized")
};


class PermissionsWatcher {
    constructor(did, isAuthorizedHandler) {
        //  utils.showTextLoader();
        this.did = did;
        this.notificationHandler = openDSU.loadAPI("error");
        this.isAuthorizedHandler = isAuthorizedHandler || defaultHandler;

        this.checkAccessAndAct().catch(err => {
            console.debug('Caught an error during booting of the PermissionsWatcher...', err);
        });

        this.setupIntervalCheck();
    }

    setupIntervalCheck() {
        //setup of credential check interval to prevent edge cases
        if (!window.credentialsCheckInterval) {
            const interval = 10 * 1000;
            window.credentialsCheckInterval = setInterval(async () => {
                this.checkAccessAndAct().catch(err => {
                    console.debug("Just logging some errors for debugging if needed", err);
                });
            }, interval);
            console.log(`Permissions will be checked once every ${interval}ms`);
        }
    }

    async checkAccessAndAct() {
        this.checkAccess().then(async (hasAccess) => {
        //    webSkel.hideLoading();
            let unAuthorizedPages = ["generate-did-page", "landing-page"];
            if (hasAccess) {
                webSkel.userRights = await this.getUserRights();
                if (!webSkel.userRights) {
                    // user hasAccess but userRights are not updated try to refresh to update
                    return $$.forceTabRefresh();
                }
                if (unAuthorizedPages.indexOf(getCurrentPageTag()) !== -1) {
                    if (!document.querySelector("left-sidebar")) {
                        document.querySelector("#page-content").insertAdjacentHTML("beforebegin", `<left-sidebar data-presenter="left-sidebar"></left-sidebar>`);
                    }
                    //if we are on a booting page then we need to redirect...
                    return this.isAuthorizedHandler();
                }
            } else {
                if (getCurrentPageTag() !== "generate-did-page") {
                    //if we are on a booting page, and we are not authorized ...
                    let did = await scAPI.getMainDIDAsync();
                    await navigateToPage("generate-did-page", {did});
                    return;
                }

                if (unAuthorizedPages.indexOf(getCurrentPageTag()) === -1) {
                    this.notificationHandler.reportUserRelevantInfo("Your credentials were removed.");
                }
                //we try to reset no matter if we had or no any credentials...
                await this.resettingCredentials();

                return;
            }
        }).catch(async err => {
            //at this point this check if fails may not be that important....
        });
    }

    async saveCredentials(credentials) {
        let enclave = credentials.enclave;
        if (window.lastCredentials && enclave.enclaveKeySSI === window.lastCredentials.enclaveKeySSI) {
            // there is no need to trigger the credentials save...
            return;
        }
        window.lastCredentials = enclave;
        try {
            const mainDSU = await $$.promisify(scAPI.getMainDSU)();
            let env = await $$.promisify(mainDSU.readFile)("/environment.json");
            env = JSON.parse(env.toString());
            const openDSU = require("opendsu");
            env[openDSU.constants.SHARED_ENCLAVE.TYPE] = enclave.enclaveType;
            env[openDSU.constants.SHARED_ENCLAVE.DID] = enclave.enclaveDID;
            env[openDSU.constants.SHARED_ENCLAVE.KEY_SSI] = enclave.enclaveKeySSI;
            await $$.promisify(scAPI.configEnvironment)(env);

            const mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
            let batchId = await mainEnclave.startOrAttachBatchAsync();
            await $$.promisify(mainEnclave.writeKey)(constants.CREDENTIAL_KEY, credentials.groupCredential);
            await $$.promisify(mainEnclave.commitBatch)(batchId);
        } catch (e) {
            this.notificationHandler.reportUserRelevantError("Failed to save wallet credentials.", e);
            return $$.forceTabRefresh();
        }
    }

    async resettingCredentials() {
        let mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
        await $$.promisify(mainEnclave.writeKey)(constants.CREDENTIAL_KEY, constants.CREDENTIAL_DELETED);
        await $$.promisify(scAPI.deleteSharedEnclave)();
    }

    async checkAccess() {
        if (!this.did) {
            try {
                this.did = await scAPI.getMainDIDAsync();
            } catch (err) {
                this.notificationHandler.reportUserRelevantError(`Failed to load the wallet`, err);
                this.notificationHandler.reportUserRelevantInfo(
                    "Application will refresh soon to ensure proper state. If you see this message again, check network connectivity and if necessary get in contact with Admin.");
                return $$.forceTabRefresh();
            }
        }

        if (!this.handler) {
            try {
                let SecretsHandler = require("opendsu").loadApi("w3cdid").SecretsHandler;
                this.handler = await SecretsHandler.getInstance(this.did);
            } catch (err) {
                this.notificationHandler.reportUserRelevantError(`Failed to load the wallet`, err);
                this.notificationHandler.reportUserRelevantInfo(
                    "Application will refresh soon to ensure proper state. If you see this message again, check network connectivity and if necessary get in contact with Admin.");
                return $$.forceTabRefresh();
            }
        }

        try {
            let creds = await this.handler.checkIfUserIsAuthorized(this.did);
            if (creds) {
                await this.saveCredentials(creds);
                if (!window.lastGroupDID) {
                    window.lastGroupDID = creds ? creds.groupCredential.groupDID : undefined;
                    const segments = creds.groupCredential.groupDID.split(":");
                    window.currentGroup = segments.pop();
                }
                if (window.lastGroupDID !== creds.groupCredential.groupDID) {
                    this.notificationHandler.reportUserRelevantInfo("Your credentials have changed!");
                    this.notificationHandler.reportUserRelevantInfo("Application will refresh soon...");
                    return $$.forceTabRefresh();
                }
                return true;
            }
        } catch (err) {
            let knownStatusCodes = [404];
            if (window.lastGroupDID) {
                this.notificationHandler.reportUserRelevantInfo("Your credentials have changed!");
                this.notificationHandler.reportUserRelevantInfo("Application will refresh soon...");
                window.lastGroupDID = "";
            }
            if (knownStatusCodes.indexOf(err.code) === -1) {
                throw err;
            }
            console.debug("Caught an error during checking access", err);
        }
        return false;
    }

    async isInGroup(groupDID, did) {
        let resolveDID = $$.promisify(openDSU.loadApi("w3cdid").resolveDID);
        let groupDIDDocument = await resolveDID(groupDID);
        let groupMembers = await $$.promisify(groupDIDDocument.listMembersByIdentity, groupDIDDocument)();

        for (let member of groupMembers) {
            if (member === did) {
                return true;
            }
        }
        return false
    }

    async getUserRights() {
        let userRights;
        const mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
        let credential = await $$.promisify(mainEnclave.readKey)(constants.CREDENTIAL_KEY);

        if (typeof credential === "object" && credential.allPossibleGroups) {
            for (let group of credential.allPossibleGroups) {
                if (await this.isInGroup(group.did, this.did)) {
                    switch (group.accessMode) {
                        case "read":
                            userRights = constants.USER_RIGHTS.READ;
                            break;
                        case "write":
                            userRights = constants.USER_RIGHTS.WRITE;
                            break;
                    }
                    break;
                }
            }
        }
        return userRights;
    }
}

export function getPermissionsWatcher(did, isAuthorizedHandler) {
    return new PermissionsWatcher(did, isAuthorizedHandler);
};
