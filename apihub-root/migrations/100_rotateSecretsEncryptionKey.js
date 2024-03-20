const apihubModule = require("apihub");
const rotateKeyAsync = async () => {
    console.log("Attempting to rotate secrets encryption key...");
    const apihubRootFolder = apihubModule.getServerConfig().storage;
    await apihubModule.getSecretsServiceInstanceAsync(apihubRootFolder);
}

module.exports = rotateKeyAsync;