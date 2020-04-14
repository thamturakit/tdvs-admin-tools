'use strict'

// ?? credential only read data from google sheet 100 rows in 100 second

const { GoogleSpreadsheet } = require('google-spreadsheet');
const cred = require('./thamturakit-data-center-credential.json');
const request = require('request');

// Delivery sheet 
const DELIVERY_GGSHEET_ID = '1jhnR4pC7wa9R1QVSDLPVlFml3K_7k87XIrWKVSA4f_8';
const DELIVERY_SHEET_ID = 1181304633;
const URL_POST = "https://tvds-service.herokuapp.com/api/involvedPartys";
// const URL_POST = "http://localhost:3000/api/involvedPartys";

(async() => {

    // connect to googlet sheet
    const doc = new GoogleSpreadsheet(DELIVERY_GGSHEET_ID);
    await doc.useServiceAccountAuth(cred);
  
    // First step must always loadInFo() from google sheet
    await doc.loadInfo();

    // select sheet
    const sheet = doc.sheetsById[DELIVERY_SHEET_ID];

    console.log("Total data rows : " + sheet.rowCount);

    // Get All data from google sheet
    // index 0  variable for awesome table
    // index 1 start data
    var data = await sheet.getRows();
    // var data = await sheet.getRows({limit:1, offset:1});

    // Send post request to REST API
    await data.forEach(sendRequest);

    // TODO : update Flag in delivery google sheet
  
})();

/**
 * Send Request to TVDS REST API 
 * @param {GoogleSpreadSheetRow} item 
 * @param {int} index 
 */
async function sendRequest(item, index) {

    // Empty name is not process
    if (item.name == "") return;
    
    var involvedParty = await toInvoledParty(item);
    
    // console.log("latitude +", item.Latitude + "longitude + ", item.Longtitude);

    request.post(
        {
            url: URL_POST,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(involvedParty)
        },
        (err, res, body) => {
            if (err) {
                console.log("error : " + err.value);
            } else {
                // console.log(body);
                console.log("status :" + res.statusCode);
            }
                
        }     
    );

    // console.log(JSON.stringify(involvedParty));
}

/**
 * clean \n \r \t \u200b within text
 * @param {string} txt 
 */
function cleanText(txt) {
    var patt = /(\n|\r|\t|\u200b)/g;
    return txt.replace(patt, "");
}

/**
 * Convert Data GoogleSpreadSheetRow to InvolvedParty Javascript Ojbect
 * @param { GoogleSpreadSheetRow }item is row data of GoogleSpreadSheetRow
 * @returns Involed Party javacript object
 */
async function toInvoledParty(item) {
    var involvedParty = {
        personalInfo : {
            titleThai: item.title,
            firstNameThai: cleanText(item.firstname),
            lastNameThai: cleanText(item.lastname)
        },
        contactAddress : {
            addressLine1: cleanText(item.address) + ' ' + cleanText(item.soi),
            addressStreet: cleanText(item.street),
            addressSubDistrict: cleanText(item.subdistrict),
            addressDistrict: cleanText(item.district),
            addressProvince: cleanText(item.province),
            addressPostalCode: item.postalcode,
            latitude: item.Latitude,
            longitude: item.Longtitude
        },
        membership: [
            {
                activity: "delivery",
                memberReference: ""
            }
        ]
    };

    // Mobile 
    // Remove - and space
    var phone = cleanText(item.phonenumber);
    phone = phone.replace(/-|\s/g, "");

    involvedParty.directContact = [];
    involvedParty.directContact.push(
        {
            method: "mobile", 
            value: phone
        }
    );
    
    // Check isshareholder
    if (item.isshareholder == "TRUE") {
        involvedParty.membership.push(
            {
                activity: "shareholder",
                memberReference: ""
            }
        );
    }

    return involvedParty;
}