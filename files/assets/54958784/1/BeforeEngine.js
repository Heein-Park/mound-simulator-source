// Scripts that run before engine initialization

// Parse string to boolean
// If the string is "true", then return true
const parseBoolean = (str) => {
    switch (str) {
        case 'true': return true;
        case 'false': return false;
        default: return undefined;
    }
};