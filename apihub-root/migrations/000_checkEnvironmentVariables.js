const environmentVariables = {
    "PSK_TMP_WORKING_DIR": process.env.PSK_TMP_WORKING_DIR,
    "PSK_CONFIG_LOCATION": process.env.PSK_CONFIG_LOCATION,
    "DEV": process.env.DEV,
    "VAULT_DOMAIN": process.env.VAULT_DOMAIN,
    "EPI_DOMAIN": process.env.EPI_DOMAIN,
    "EPI_SUBDOMAIN": process.env.EPI_SUBDOMAIN,
    "BUILD_SECRET_KEY": process.env.BUILD_SECRET_KEY,
    "BDNS_ROOT_HOSTS": process.env.BDNS_ROOT_HOSTS,
    "OPENDSU_ENABLE_DEBUG": process.env.OPENDSU_ENABLE_DEBUG,
    "SSO_SECRETS_ENCRYPTION_KEY": process.env.SSO_SECRETS_ENCRYPTION_KEY,
    "MIGRATION_FOLDER_PATH": process.env.MIGRATION_FOLDER_PATH,
    "EPI_VERSION": process.env.EPI_VERSION,
}

function validateBase64Length(encodedString) {
    const base64Length = Buffer.from(encodedString, 'base64').length;
    if (base64Length !== 32) {
        throw new Error(`Invalid base64 length: ${base64Length}. Expected 32 bytes.`);
    }
}

function validateEnvironmentVariables(envVars) {
    for (const [key, value] of Object.entries(envVars)) {
        if (value === undefined || value === '') {
            throw new Error(`Environment variable ${key} is empty or undefined.`);
        }

        // Additional check for BDNS_ROOT_HOSTS
        if (key === 'BDNS_ROOT_HOSTS' && value !== 'http://127.0.0.1:8080') {
            throw new Error(`BDNS_ROOT_HOSTS does not match the expected value.`);
        }

        if (key === 'SSO_SECRETS_ENCRYPTION_KEY') {
            const parts = value.split(',');
            if (parts.length > 2) {
                throw new Error(`SSO_SECRETS_ENCRYPTION_KEY contains more than two base64 strings.`);
            }
            parts.forEach(part => validateBase64Length(part.trim()));
        }
    }
}

module.exports = async ()=>{
    validateEnvironmentVariables(environmentVariables);
};
