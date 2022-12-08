pc.customMath = {};

// Custom Math Round
// Get two arguments that are integers or floats
// Calculate the rounded value between two numbers
pc.customMath.round = ( x, y ) => Math.round( x * y )/y;

// Custom Math Average All Floats In An Array
// As the title described, average all the floats in a specific array
// But also, apply a weight curve and correction value when the arguments are filled
pc.customMath.averageFloatArray = function ( array, weightCurve, correctionVal ) {
    if(Array.isArray(array)) {
        let average = 0;
        for (let i = 0; i < array.length; i++) {
            average += array[i] * (weightCurve?weightCurve.value(i/array.length):1) * (correctionVal?correctionVal:1);
        }

        average /= array.length;

        return average;
    } else {
        console.error("function averageFloatArray didn't get an array.");
    }
};

pc.customMath.vec2ToDeg = (vec2, isDeg) => {
    return (vec2.x > 0? -1: 1) * Math.acos(vec2.dot(pc.Vec2.DOWN)) * (isDeg? pc.math.RAD_TO_DEG: 1);
};