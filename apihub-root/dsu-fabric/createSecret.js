require("../../opendsu-sdk/builds/output/pskWebServer");
function base58DID(did){
    const opendsu = require("opendsu");
    const crypto = opendsu.loadApi("crypto");
    if(typeof did === "object"){
        did = did.getIdentifier();
    }
    return crypto.encodeBase58(did);
}
const createSecret = async () => {
    const rootFolder = "../"
    const secretsServiceInstance = await require('apihub').getSecretsServiceInstanceAsync(rootFolder);
    const SECRET_NAME = "mqMigration";
    const w3cdid = require("opendsu").loadApi("w3cdid");
    const migrationDID = await $$.promisify(w3cdid.getKeyDIDFromSecret)("Migration_2023.2.0");

    const migrationDIDIdentifier = base58DID(migrationDID);
    let secret = {
        enclave: process.env.DEMIURGE_SHARED_ENCLAVE_KEY_SSI
    }
    await secretsServiceInstance.putSecretAsync(SECRET_NAME, migrationDIDIdentifier, JSON.stringify(secret));
    console.log("Secret created");
}

createSecret().then(() => {
    console.log("Done");
}).catch((err) => {
    console.log(err);
    process.exit(1);
})
