import {getUserDetails, loadPage, getSSOId, generateRandom} from "../../../utils/utils.js";
import {getPermissionsWatcher} from "../../../services/PermissionsWatcher.js";
import env from "../../../environment.js";
const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const crypto = openDSU.loadAPI("crypto");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const resolver = openDSU.loadAPI("resolver");
const systemAPI = openDSU.loadAPI("system");
const enclaveAPI = openDSU.loadAPI("enclave");
const DEFAULT_PIN = "1qaz";

export class LandingPage {
    constructor(element, invalidate) {
        this.element = element;
        this.invalidate = invalidate;
        this.sourcePage = this.element.getAttribute("data-source-page");
        this.invalidate(async () => {
            try {
                this.encryptedSSOSecret = await this.getSSOSecret();
            } catch (e) {
                console.log("generate new secret")
                this.encryptedSSOSecret = await this.putSSOSecret();
            }

            const versionlessSSI = keySSISpace.createVersionlessSSI(undefined, `/${this.getSSODetectedId()}`, this.deriveEncryptionKey(this.encryptedSSOSecret));
            try {
                const dsu = await this.loadWallet();
                let envJson = await dsu.readFileAsync("environment.json");
                envJson = JSON.parse(envJson);
                console.log(envJson);
                env.WALLET_MAIN_DID = envJson.WALLET_MAIN_DID;
                env.enclaveKeySSI = envJson.enclaveKeySSI;
                env.enclaveType = envJson.enclaveType;
                env.enclaveDID = envJson.enclaveDID;
            } catch (e) {
                // No previous version wallet found
            }
            let mainDSU;
            try {
                mainDSU = await $$.promisify(resolver.loadDSU)(versionlessSSI);
            } catch (error) {
                try {
                    mainDSU = await $$.promisify(resolver.createDSUForExistingSSI)(versionlessSSI);
                    await $$.promisify(mainDSU.writeFile)('environment.json', JSON.stringify(env));
                } catch (e) {
                    console.log(e);
                }
            }

            scAPI.setMainDSU(mainDSU);
            const sc = scAPI.getSecurityContext();
            if (sc.isInitialised()) {
                return await this.getWalletAccess();
            }
            sc.on("initialised", async () => {
                console.log("Initialised");
                return await this.getWalletAccess();
            });
        });
    }

    deriveEncryptionKey = (key) => {
        return crypto.deriveEncryptionKey(key);
    }
    getSSODetectedId = () => {
        return getSSOId("SSODetectedId");
    }

    getSSOUserId = () => {
        return getSSOId("SSOUserId");
    }
    putSSOSecret = async () => {
        let secret = crypto.generateRandom(32).toString("base64");
        let encrypted = this.encrypt(DEFAULT_PIN, secret);
        let putData = {secret: JSON.stringify(JSON.parse(encrypted).data)};
        const url = `${systemAPI.getBaseURL()}/putSSOSecret/${env.appName}`;
        try {
            await fetch(url, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(putData)
            });
        }catch (e) {
            console.log(e);
        }
        return putData.secret;
    }

    getSSOSecret = async () => {
        const url = `${systemAPI.getBaseURL()}/getSSOSecret/${env.appName}`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Secret not found");
            }

            throw new Error(`Failed to get secret: ${response.status}`);
        }
        const encryptedSecret = await response.text();
        return encryptedSecret;
    }

    encrypt(key, dataObj) {
        const encryptionKey = crypto.deriveEncryptionKey(key);
        const encryptedCredentials = crypto.encrypt(JSON.stringify(dataObj), encryptionKey);
        return JSON.stringify(encryptedCredentials);
    }

    decrypt(key, encryptedData) {
        const encryptionKey = crypto.deriveEncryptionKey(key);
        const decryptData = crypto.decrypt($$.Buffer.from(JSON.parse(encryptedData)), encryptionKey);
        return JSON.parse(decryptData.toString());
    }

    getWalletSecretsArray(encryptedSSOSecret) {
        const ssoSecret = this.decrypt(DEFAULT_PIN, encryptedSSOSecret);
        return [this.getSSODetectedId(), this.getSSOUserId(), ssoSecret, env.appName];
    }

    loadWallet = async () => {
        let resolver = require("opendsu").loadApi("resolver");
        let keyssi = require("opendsu").loadApi("keyssi");
        let walletSSI = keyssi.createTemplateWalletSSI(env.vaultDomain, this.getWalletSecretsArray(this.encryptedSSOSecret));
        const constDSU = await $$.promisify(resolver.loadDSU)(walletSSI);
        return constDSU.getWritableDSU();
    }

    createDID = async () => {
        const userDetails = getUserDetails();
        const vaultDomain = await $$.promisify(scAPI.getVaultDomain)();
        const openDSU = require("opendsu");
        const config = openDSU.loadAPI("config");
        let appName = await $$.promisify(config.getEnv)("appName");
        let userId = `${appName}/${userDetails}`;
        let did;
        let i = 1;
        do {
            try {
                did = await $$.promisify(w3cDID.resolveDID)(`did:ssi:name:${vaultDomain}:${userId}`);
            } catch (e) {
                did = null;
            }
            if (did) {
                userId = userId + i++;
            }
        } while (did)

        did = await $$.promisify(w3cDID.createIdentity)("ssi:name", vaultDomain, userId);
        return did.getIdentifier();
    }

    getWalletAccess = async () => {
        await webSkel.showLoading();
        try {
            let mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
            let did;
            try {
                did = await scAPI.getMainDIDAsync();
            } catch (e) {
                // TODO check error type to differentiate between business and technical error
                // this.notificationHandler.reportDevRelevantInfo("DID not yet created", e);
            }
            let shouldPersist = false;
            if (!did) {
                did = await this.createDID();
                shouldPersist = true;
            }


            if (this.sourcePage === "#landing-page" || this.sourcePage === "#generate-did-page") {
                this.sourcePage = "#home-page";
            }

            getPermissionsWatcher(did, async () => {
                await webSkel.appServices.addAccessLog(did);
                await loadPage(this.sourcePage);
            });

            if (!shouldPersist) {
                return;
            }

            let batchId;
            try {
                batchId = await mainEnclave.startOrAttachBatchAsync();
                await scAPI.setMainDIDAsync(did);
                await mainEnclave.commitBatchAsync(batchId);
            } catch (e) {
                const writeKeyError = createOpenDSUErrorWrapper(`Failed to write key`, e);
                try {
                    await mainEnclave.cancelBatchAsync(batchId);
                } catch (error) {
                    throw createOpenDSUErrorWrapper(`Failed to cancel batch`, error, writeKeyError);
                }
                throw writeKeyError;
            }
        } catch (err) {
            webSkel.notificationHandler.reportUserRelevantError("Failed to initialize wallet", err);
            setTimeout(() => {
                window.disableRefreshSafetyAlert = true;
                window.location.reload()
            }, 2000)
        }
    }


    beforeRender() {

    }

    afterRender() {
    }

}
