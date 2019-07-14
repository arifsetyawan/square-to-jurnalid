const SquareConnect = require("square-connect");
const defaultClient = SquareConnect.ApiClient.instance;
const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const Moment = require("moment-timezone");
const argv = require("minimist")(process.argv.slice(2));

const fileUtil = require("./util/file");
const numberUtil = require("./util/number");

const auth_config = require("./config/auth.config");
const square_config = require("./config/square.config");
const jurnal_config = require("./config/jurnal.config");
const run_config = require("./config/run.config");

/**
 * Squareup Connection Config
 * =======================================================
 */
const oauth2 = defaultClient.authentications["oauth2"];
oauth2.accessToken = auth_config.square.oauth.accessToken;
const SqApiInstance = new SquareConnect.V1TransactionsApi();

/**
 * Request Mapping Function
 */
async function requestMapping() {
  // parsing date
  run_config.Day = argv.d ? _.padStart(argv.d, 2, "0") : Moment().format("DD");
  run_config.Month = argv.m ? _.padStart(argv.m, 2, "0") : Moment().format("MM");
  run_config.Year = argv.y || argv.year || Moment().format("YYYY");

  run_config.InvoiceNumber = `POS${run_config.Year}${run_config.Month}${run_config.Day}`;

  const today = `${run_config.Year}-${run_config.Month}-${run_config.Day}`;
  run_config.BeginTime = Moment(today).tz("Asia/Makassar").format("YYYY-MM-DDTHH:mm:ss");
  run_config.EndTime = Moment(today).tz("Asia/Makassar").add(24, 'h').subtract(1, 's').format("YYYY-MM-DDTHH:mm:ss");
}

/**
 * Main Function
 * @returns {Promise<void>}
 */
async function main() {
  // accept date as input args and map to beginTime and endTime
  await requestMapping();

  try {
    const SqOpts = {
      order: "DESC",
      beginTime: run_config.BeginTime,
      endTime: run_config.EndTime,
      limit: 200,
      includePartial: true
    };

    console.log(SqOpts);

    const paymentsData = await SqApiInstance.listPayments(square_config.location_id, SqOpts);
    const refundsData = await SqApiInstance.listRefunds(square_config.location_id, SqOpts);
    const filteredPaymentsData = _.filter(paymentsData, o => {
      return o.itemizations.length > 0;
    });

    filteredPaymentsData.map(payment => {
      console.log("-------------------------------");
      console.log(payment.id);
      //console.log(payment.tender);
      //console.log(payment.itemizations);
      const items = payment.itemizations;
      items.map(item => {
        console.log(`${item.name} (${item.quantity}) tax(${JSON.stringify(item.taxes)}) ${item.total_money.amount/100} ${JSON.stringify(item.modifiers)}`);
      });
    });

    refundsData.map(refund => {
      console.log(refund);
    });
  } catch (error) {
    console.error(error);
  }
}

main();
