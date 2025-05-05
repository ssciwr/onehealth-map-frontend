/* Going to store here getting our data from the remote server and preparing it to be set as state, since many
chart options do this.
 */

const csvFileToArray = string => {
    const csvHeader = string.slice(0, string.indexOf("\n")).split(",");
    const csvRows = string.slice(string.indexOf("\n") + 1).split("\n"); // ignore header.
    console.log('First CSV row: ', csvRows[0]);

    // Filter out empty rows and properly parse values
    const array = csvRows
        .filter(row => row.trim() !== '') // Filter out empty rows
        .map(dataRow => {
            const values = dataRow.split(",");
            // Make sure we have valid numbers for lat/long
            return [
                parseFloat(values[0]), // year
                parseFloat(values[1]), // latitude
                parseFloat(values[2]), // longitude
                parseFloat(values[3])  // value
            ].map(val => isNaN(val) ? 0 : val); // Replace NaN with default values
        })
        .filter(row => !isNaN(row[1]) && !isNaN(row[2])); // Filter out rows with invalid lat/long

    console.log('Our array is now: ', array);
    return array;
};

export const getReadyCSVData = async (latLngAsProperties: boolean=false) => {
    try {
        //const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january.csv");
        const response = await fetch("era5_data_2024_01_02_monthly_area_celsius_january_05res.csv");
        const text = await response.text();
        let data = csvFileToArray(text);
        if (latLngAsProperties) {
            data = data.map((row) => ({ lat: row[1], lng: row[2], intensity: row[3]}))
        }
        return data;
    } catch (err) {
        console.error('Failed to load CSV data:', err);
        throw err;
    }
};